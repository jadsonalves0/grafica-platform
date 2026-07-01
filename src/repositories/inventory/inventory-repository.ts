import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient, type Product, type ProductCategory } from "@prisma/client";

import {
  ensureOperationalSettings,
  normalizeEmpty,
  registerInputStock,
  registerOutputStockByFifo,
  registerOutputStockFromSpecificLayers,
  roundCurrency,
  roundQuantity,
  toNumber,
} from "@/repositories/inventory/stock-ledger";

type ProductHistoryInput = {
  companyId: string;
  productId?: string;
  changedByUserId?: string;
  changeType: "COST" | "PRICE";
  previousValue: number;
  newValue: number;
  origin: string;
  relatedDocument?: string;
  justification?: string;
};

export class InventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async findProductsByIds(companyId: string, productIds: string[]) {
    return this.db.product.findMany({
      where: {
        companyId,
        id: {
          in: productIds,
        },
      },
      include: {
        category: true,
      },
    });
  }

  async listLatestSupplierMappingsForProductIds(companyId: string, productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }

    return this.db.$queryRaw<
      Array<{
        internalItemId: string;
        supplierId: string | null;
        supplierName: string | null;
        supplierDocument: string | null;
        supplierProductCode: string | null;
        purchaseUnit: string | null;
        stockUnit: string | null;
        conversionFactor: Prisma.Decimal | null;
        confidence: Prisma.Decimal | null;
        lastUsedAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT DISTINCT ON (internal_item_id)
        internal_item_id AS "internalItemId",
        supplier_id AS "supplierId",
        supplier_name AS "supplierName",
        supplier_document AS "supplierDocument",
        supplier_product_code AS "supplierProductCode",
        purchase_unit AS "purchaseUnit",
        stock_unit AS "stockUnit",
        conversion_factor AS "conversionFactor",
        confidence,
        last_used_at AS "lastUsedAt"
      FROM supplier_item_mappings
      WHERE company_id = ${companyId}::uuid
        AND internal_item_id IN (${Prisma.join(productIds.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY internal_item_id, last_used_at DESC NULLS LAST, updated_at DESC
    `);
  }

  async findSupplierById(companyId: string, supplierId: string) {
    return this.db.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
      },
    });
  }

  async findSupplierByDocumentOrName(
    companyId: string,
    input: {
      document?: string | null;
      name?: string | null;
    },
  ) {
    const normalizedDocument = normalizeDocument(input.document ?? undefined);

    if (normalizedDocument) {
      const byDocument = await this.db.supplier.findFirst({
        where: {
          companyId,
          document: normalizedDocument,
        },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      });

      if (byDocument) {
        return byDocument;
      }
    }

    const normalizedName = normalizeEmpty(input.name ?? undefined);

    if (!normalizedName) {
      return null;
    }

    return this.db.supplier.findFirst({
      where: {
        companyId,
        OR: [
          { legalName: { equals: normalizedName, mode: "insensitive" } },
          { tradeName: { equals: normalizedName, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
  }

  async getOperationalSettings(companyId: string) {
    return ensureOperationalSettings(this.db, companyId);
  }

  async updateOperationalSettings(
    companyId: string,
    input: {
      defaultMarginPercent: number;
      minimumMarginPercent: number;
      costVariationAlertPercent: number;
      regularDiscountLimitPercent: number;
      managerDiscountLimitPercent: number;
      allowNegativeStock: boolean;
    },
  ) {
    return this.db.companyOperationalSetting.upsert({
      where: { companyId },
      update: {
        defaultMarginPercent: input.defaultMarginPercent,
        minimumMarginPercent: input.minimumMarginPercent,
        costVariationAlertPercent: input.costVariationAlertPercent,
        regularDiscountLimitPercent: input.regularDiscountLimitPercent,
        managerDiscountLimitPercent: input.managerDiscountLimitPercent,
        allowNegativeStock: input.allowNegativeStock,
      },
      create: {
        companyId,
        defaultMarginPercent: input.defaultMarginPercent,
        minimumMarginPercent: input.minimumMarginPercent,
        costVariationAlertPercent: input.costVariationAlertPercent,
        regularDiscountLimitPercent: input.regularDiscountLimitPercent,
        managerDiscountLimitPercent: input.managerDiscountLimitPercent,
        allowNegativeStock: input.allowNegativeStock,
      },
    });
  }

  async createGroup(input: {
    companyId: string;
    name: string;
    description?: string;
    defaultMargin?: number;
    showOnWebsite: boolean;
    isActive: boolean;
  }): Promise<ProductCategory> {
    return this.db.productCategory.create({
      data: {
        companyId: input.companyId,
        name: input.name.trim(),
        description: normalizeEmpty(input.description),
        defaultMargin: input.defaultMargin,
        showOnWebsite: input.showOnWebsite,
        isActive: input.isActive,
      },
    });
  }

  async listGroups(companyId: string, search?: string) {
    return this.db.productCategory.findMany({
      where: {
        companyId,
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  async findGroupById(companyId: string, groupId: string) {
    return this.db.productCategory.findFirst({
      where: {
        id: groupId,
        companyId,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findGroupByName(companyId: string, name: string) {
    return this.db.productCategory.findFirst({
      where: {
        companyId,
        name: name.trim(),
      },
    });
  }

  async findGroupByNameExcludingId(companyId: string, name: string, groupId: string) {
    return this.db.productCategory.findFirst({
      where: {
        companyId,
        name: name.trim(),
        id: {
          not: groupId,
        },
      },
    });
  }

  async updateGroup(
    groupId: string,
    input: {
      name: string;
      description?: string;
      defaultMargin?: number;
      showOnWebsite: boolean;
      isActive: boolean;
    },
  ) {
    return this.db.productCategory.update({
      where: {
        id: groupId,
      },
      data: {
        name: input.name.trim(),
        description: normalizeEmpty(input.description),
        defaultMargin: input.defaultMargin,
        showOnWebsite: input.showOnWebsite,
        isActive: input.isActive,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async createProduct(input: {
    companyId: string;
    categoryId?: string;
    name: string;
    sku?: string;
    barcode?: string;
    unit: string;
    type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
    controlsStock: boolean;
    showOnWebsite: boolean;
    desiredMargin?: number;
    costPrice: number;
    salePrice: number;
    minimumStock: number;
    historyEntries?: ProductHistoryInput[];
  }): Promise<Product> {
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          companyId: input.companyId,
          categoryId: normalizeEmpty(input.categoryId),
          name: input.name.trim(),
          sku: normalizeEmpty(input.sku),
          barcode: normalizeEmpty(input.barcode),
          unit: input.unit.trim(),
          type: input.type,
          controlsStock: input.controlsStock,
          showOnWebsite: input.showOnWebsite,
          desiredMargin: input.desiredMargin,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          minimumStock: input.minimumStock,
        },
      });

      if (input.historyEntries?.length) {
        await tx.productPriceHistory.createMany({
          data: input.historyEntries.map((entry) => ({
            companyId: entry.companyId,
            productId: product.id,
            changedByUserId: entry.changedByUserId,
            changeType: entry.changeType,
            previousValue: entry.previousValue,
            newValue: entry.newValue,
            origin: entry.origin,
            relatedDocument: normalizeEmpty(entry.relatedDocument),
            justification: normalizeEmpty(entry.justification),
          })),
        });
      }

      return product;
    });
  }

  async listProducts(
    companyId: string,
    search?: string,
    categoryId?: string,
    options?: {
      onlyActive?: boolean;
      limit?: number;
    },
  ) {
    return this.db.product.findMany({
      where: {
        companyId,
        ...(options?.onlyActive ? { isActive: true } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
                { category: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        stockLayers: {
          where: {
            availableQuantity: {
              gt: 0,
            },
          },
          select: {
            availableQuantity: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      ...(options?.limit ? { take: options.limit } : {}),
    });
  }

  async findProductById(companyId: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        id: productId,
        companyId,
      },
      include: {
        category: true,
        stockLayers: {
          where: {
            availableQuantity: {
              gt: 0,
            },
          },
          select: {
            availableQuantity: true,
          },
        },
        priceHistories: {
          include: {
            changedByUser: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    });
  }

  async findProductBySku(companyId: string, sku: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        sku: normalizeEmpty(sku),
      },
    });
  }

  async findProductByBarcode(companyId: string, barcode: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        barcode: normalizeEmpty(barcode),
      },
    });
  }

  async findProductBySkuExcludingId(companyId: string, sku: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        sku: normalizeEmpty(sku),
        id: {
          not: productId,
        },
      },
    });
  }

  async findProductByBarcodeExcludingId(companyId: string, barcode: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        barcode: normalizeEmpty(barcode),
        id: {
          not: productId,
        },
      },
    });
  }

  async updateProduct(
    companyId: string,
    productId: string,
    input: {
      categoryId?: string;
      name: string;
      sku?: string;
      barcode?: string;
      unit: string;
      type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
      controlsStock: boolean;
      showOnWebsite: boolean;
      desiredMargin?: number;
      costPrice: number;
      salePrice: number;
      minimumStock: number;
      historyEntries?: ProductHistoryInput[];
    },
  ): Promise<Product> {
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          categoryId: normalizeEmpty(input.categoryId),
          name: input.name.trim(),
          sku: normalizeEmpty(input.sku),
          barcode: normalizeEmpty(input.barcode),
          unit: input.unit.trim(),
          type: input.type,
          controlsStock: input.controlsStock,
          showOnWebsite: input.showOnWebsite,
          desiredMargin: input.desiredMargin,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          minimumStock: input.minimumStock,
        },
      });

      if (input.historyEntries?.length) {
        await tx.productPriceHistory.createMany({
          data: input.historyEntries.map((entry) => ({
            companyId,
            productId,
            changedByUserId: entry.changedByUserId,
            changeType: entry.changeType,
            previousValue: entry.previousValue,
            newValue: entry.newValue,
            origin: entry.origin,
            relatedDocument: normalizeEmpty(entry.relatedDocument),
            justification: normalizeEmpty(entry.justification),
          })),
        });
      }

      return product;
    });
  }

  async createEntry(input: {
    companyId: string;
    entryType:
      | "PURCHASE_INVOICE"
      | "PURCHASE_WITHOUT_INVOICE"
      | "INITIAL_BALANCE"
      | "RETURN"
      | "BONUS"
      | "OTHER";
    supplierId?: string;
    supplierDocument?: string;
    supplierName?: string;
    documentNumber: string;
    entryDate: Date;
    notes?: string;
    financialCondition: "NONE" | "CASH" | "TERM";
    financialAccountId?: string;
    installmentCount: number;
    firstDueDate?: Date;
    subtotal: number;
    totalAmount: number;
    items: Array<{
      productId: string;
      description: string;
      unit: string;
      quantity: number;
      unitCost: number;
      subtotal: number;
      previousCostPrice?: number;
      previousSalePrice?: number;
      suggestedSalePrice?: number;
      estimatedMarginPercent?: number;
      priceDecision?: string;
      decisionJustification?: string;
      customSalePrice?: number;
    }>;
  }) {
    return this.db.inventoryEntry.create({
      data: {
        companyId: input.companyId,
        entryType: input.entryType,
        supplierId: input.supplierId,
        supplierDocument: normalizeDocument(input.supplierDocument),
        supplierName: normalizeEmpty(input.supplierName),
        documentNumber: input.documentNumber.trim(),
        entryDate: input.entryDate,
        notes: normalizeEmpty(input.notes),
        financialCondition: input.financialCondition,
        financialAccountId: input.financialAccountId,
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        subtotal: input.subtotal,
        totalAmount: input.totalAmount,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            description: item.description.trim(),
            unit: item.unit.trim(),
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.subtotal,
            previousCostPrice: item.previousCostPrice,
            previousSalePrice: item.previousSalePrice,
            suggestedSalePrice: item.suggestedSalePrice,
            estimatedMarginPercent: item.estimatedMarginPercent,
            priceDecision: normalizeEmpty(item.priceDecision),
            decisionJustification: normalizeEmpty(item.decisionJustification),
            customSalePrice: item.customSalePrice,
          })),
        },
      },
      include: inventoryEntryInclude,
    });
  }

  async listEntries(
    companyId: string,
    filters?: {
      search?: string;
      status?: "DRAFT" | "CONFIRMED" | "CANCELED";
    },
  ) {
    const searchTerm = filters?.search?.trim() || null;

    return this.db.$queryRaw<Array<{
      id: string;
      entryType: string;
      source: string | null;
      supplierId: string | null;
      supplierName: string | null;
      supplierDocument: string | null;
      documentNumber: string;
      accessKey: string | null;
      entryDate: Date;
      financialCondition: string;
      status: string;
      subtotal: Prisma.Decimal | number;
      totalAmount: Prisma.Decimal | number;
      createdAt: Date;
      confirmedAt: Date | null;
      itemsCount: number;
    }>>(Prisma.sql`
      SELECT
        entry.id,
        entry.entry_type AS "entryType",
        entry.source,
        entry.supplier_id AS "supplierId",
        entry.supplier_name AS "supplierName",
        entry.supplier_document AS "supplierDocument",
        entry.document_number AS "documentNumber",
        entry.access_key AS "accessKey",
        entry.entry_date AS "entryDate",
        entry.financial_condition AS "financialCondition",
        entry.status,
        entry.subtotal,
        entry.total_amount AS "totalAmount",
        entry.created_at AS "createdAt",
        entry.confirmed_at AS "confirmedAt",
        COUNT(item.id)::int AS "itemsCount"
      FROM inventory_entries entry
      LEFT JOIN inventory_entry_items item ON item.inventory_entry_id = entry.id
      WHERE entry.company_id = ${companyId}::uuid
        AND (${filters?.status ?? null}::"InventoryEntryStatus" IS NULL OR entry.status = ${filters?.status ?? null}::"InventoryEntryStatus")
        AND (
          ${searchTerm}::varchar IS NULL
          OR entry.document_number ILIKE '%' || ${searchTerm}::varchar || '%'
          OR COALESCE(entry.supplier_name, '') ILIKE '%' || ${searchTerm}::varchar || '%'
        )
      GROUP BY entry.id
      ORDER BY entry.entry_date DESC, entry.created_at DESC
    `);
  }

  async findEntryById(companyId: string, entryId: string) {
    return loadInventoryEntryDetail(this.db, companyId, entryId);
  }

  async findDuplicatedEntryDocument(
    companyId: string,
    input: {
      supplierName?: string;
      entryType:
        | "PURCHASE_INVOICE"
        | "PURCHASE_WITHOUT_INVOICE"
        | "INITIAL_BALANCE"
        | "RETURN"
        | "BONUS"
        | "OTHER";
      documentNumber: string;
      excludeEntryId?: string;
    },
  ) {
    return this.db.inventoryEntry.findFirst({
      where: {
        companyId,
        supplierName: normalizeEmpty(input.supplierName),
        entryType: input.entryType,
        documentNumber: input.documentNumber.trim(),
        ...(input.excludeEntryId ? { id: { not: input.excludeEntryId } } : {}),
      },
    });
  }

  async findEntryByAccessKey(companyId: string, accessKey: string) {
    const rows = await this.db.$queryRaw<Array<{ id: string; documentNumber: string }>>(Prisma.sql`
      SELECT id, document_number AS "documentNumber"
      FROM inventory_entries
      WHERE company_id = ${companyId}::uuid
        AND access_key = ${accessKey}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async findSupplierMappingCandidates(
    companyId: string,
    input: {
      supplierDocument?: string | null;
      supplierName?: string | null;
      supplierProductCode?: string | null;
      supplierEan?: string | null;
      supplierProductName?: string | null;
    },
  ) {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        internalItemId: string;
        productName: string;
        productUnit: string;
        confidence: Prisma.Decimal | null;
        purchaseUnit: string | null;
        stockUnit: string | null;
        conversionFactor: Prisma.Decimal | null;
      }>
    >(Prisma.sql`
      SELECT
        mapping.id,
        mapping.internal_item_id AS "internalItemId",
        product.name AS "productName",
        product.unit AS "productUnit",
        mapping.confidence,
        mapping.purchase_unit AS "purchaseUnit",
        mapping.stock_unit AS "stockUnit",
        mapping.conversion_factor AS "conversionFactor"
      FROM supplier_item_mappings mapping
      INNER JOIN products product ON product.id = mapping.internal_item_id
      WHERE mapping.company_id = ${companyId}::uuid
        AND (
          (${input.supplierEan ?? null}::varchar IS NOT NULL AND mapping.supplier_ean = ${input.supplierEan ?? null}::varchar)
          OR (${input.supplierProductCode ?? null}::varchar IS NOT NULL AND mapping.supplier_product_code = ${input.supplierProductCode ?? null}::varchar)
          OR (
            ${input.supplierProductName ?? null}::varchar IS NOT NULL
            AND LOWER(mapping.supplier_product_name) = LOWER(${input.supplierProductName ?? null}::varchar)
            AND (
              (${input.supplierDocument ?? null}::varchar IS NOT NULL AND mapping.supplier_document = ${input.supplierDocument ?? null}::varchar)
              OR (${input.supplierName ?? null}::varchar IS NOT NULL AND LOWER(mapping.supplier_name) = LOWER(${input.supplierName ?? null}::varchar))
            )
          )
        )
      ORDER BY mapping.last_used_at DESC NULLS LAST, mapping.updated_at DESC
      LIMIT 5
    `);

    return rows.map((row) => ({
      ...row,
      confidence: row.confidence ? row.confidence.toNumber() : null,
      conversionFactor: row.conversionFactor ? row.conversionFactor.toNumber() : null,
    }));
  }

  async createImportedEntryDraft(input: {
    companyId: string;
    entryType:
      | "PURCHASE_INVOICE"
      | "PURCHASE_WITHOUT_INVOICE"
      | "INITIAL_BALANCE"
      | "RETURN"
      | "BONUS"
      | "OTHER";
    supplierId?: string | null;
    supplierName?: string | null;
    supplierDocument?: string | null;
    documentNumber: string;
    documentSeries?: string | null;
    accessKey?: string | null;
    issuedAt?: Date | null;
    entryDate: Date;
    notes?: string | null;
    protocol?: string | null;
    subtotal: number;
    totalAmount: number;
    items: Array<{
      productId?: string | null;
      supplierItemMappingId?: string | null;
      lineNumber?: number | null;
      supplierProductCode?: string | null;
      supplierProductName?: string | null;
      supplierEan?: string | null;
      ncm?: string | null;
      cfop?: string | null;
      description: string;
      purchaseUnit?: string | null;
      unit: string;
      conversionFactor?: number | null;
      quantity: number;
      unitCost: number;
      subtotal: number;
      previousCostPrice?: number | null;
      previousSalePrice?: number | null;
      suggestedSalePrice?: number | null;
      estimatedMarginPercent?: number | null;
      priceDecision?: string | null;
      matchStatus?: string | null;
      matchConfidence?: number | null;
    }>;
  }) {
    return this.db.$transaction(async (tx) => {
      const entryId = randomUUID();

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO inventory_entries (
          id,
          company_id,
          entry_type,
          source,
          supplier_id,
          supplier_name,
          supplier_document,
          document_number,
          document_series,
          access_key,
          issued_at,
          protocol,
          entry_date,
          notes,
          status,
          financial_condition,
          installment_count,
          subtotal,
          total_amount,
          updated_at
        ) VALUES (
          ${entryId}::uuid,
          ${input.companyId}::uuid,
          ${input.entryType}::"InventoryEntryType",
          'XML',
          ${input.supplierId ?? null}::uuid,
          ${normalizeEmpty(input.supplierName ?? undefined)},
          ${normalizeEmpty(input.supplierDocument ?? undefined)},
          ${input.documentNumber.trim()},
          ${normalizeEmpty(input.documentSeries ?? undefined)},
          ${normalizeEmpty(input.accessKey ?? undefined)},
          ${input.issuedAt ?? null},
          ${normalizeEmpty(input.protocol ?? undefined)},
          ${input.entryDate},
          ${normalizeEmpty(input.notes ?? undefined)},
          'DRAFT'::"InventoryEntryStatus",
          'NONE'::"FinancialCondition",
          1,
          ${input.subtotal},
          ${input.totalAmount},
          NOW()
        )
      `);

      await insertImportedEntryItems(tx, entryId, input.items);

      const entry = await loadInventoryEntryDetail(tx, input.companyId, entryId);

      if (!entry) {
        throw new Error("Nao foi possivel criar o rascunho da entrada importada.");
      }

      return entry;
    });
  }

  async createAttachment(input: {
    companyId: string;
    inventoryEntryId?: string | null;
    entityType: string;
    entityId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    documentType?: string | null;
    source?: string | null;
    createdByUserId?: string | null;
  }) {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        storagePath: string;
        documentType: string | null;
        source: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      INSERT INTO operational_document_attachments (
        company_id,
        inventory_entry_id,
        entity_type,
        entity_id,
        file_name,
        mime_type,
        file_size,
        storage_path,
        document_type,
        source,
        created_by_user_id
      ) VALUES (
        ${input.companyId}::uuid,
        ${input.inventoryEntryId ?? null}::uuid,
        ${input.entityType},
        ${input.entityId},
        ${input.fileName},
        ${input.mimeType},
        ${input.fileSize},
        ${input.storagePath},
        ${normalizeEmpty(input.documentType ?? undefined)},
        ${normalizeEmpty(input.source ?? undefined)},
        ${input.createdByUserId ?? null}::uuid
      )
      RETURNING
        id,
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "fileSize",
        storage_path AS "storagePath",
        document_type AS "documentType",
        source,
        created_at AS "createdAt"
    `);

    return rows[0] ?? null;
  }

  async listEntryAttachments(companyId: string, entryId: string) {
    return this.db.$queryRaw<
      Array<{
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        storagePath: string;
        documentType: string | null;
        source: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "fileSize",
        storage_path AS "storagePath",
        document_type AS "documentType",
        source,
        created_at AS "createdAt"
      FROM operational_document_attachments
      WHERE company_id = ${companyId}::uuid
        AND inventory_entry_id = ${entryId}::uuid
      ORDER BY created_at ASC
    `);
  }

  async findEntryAttachment(companyId: string, entryId: string, attachmentId: string) {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        storagePath: string;
        documentType: string | null;
        source: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "fileSize",
        storage_path AS "storagePath",
        document_type AS "documentType",
        source,
        created_at AS "createdAt"
      FROM operational_document_attachments
      WHERE company_id = ${companyId}::uuid
        AND inventory_entry_id = ${entryId}::uuid
        AND id = ${attachmentId}::uuid
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async deleteEntryAttachment(companyId: string, entryId: string, attachmentId: string) {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        storagePath: string;
        documentType: string | null;
        source: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      DELETE FROM operational_document_attachments
      WHERE company_id = ${companyId}::uuid
        AND inventory_entry_id = ${entryId}::uuid
        AND id = ${attachmentId}::uuid
      RETURNING
        id,
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "fileSize",
        storage_path AS "storagePath",
        document_type AS "documentType",
        source,
        created_at AS "createdAt"
    `);

    return rows[0] ?? null;
  }

  async matchEntryItem(input: {
    companyId: string;
    entryId: string;
    entryItemId: string;
    internalItemId: string;
    supplierItemMappingId?: string | null;
    purchaseUnit?: string | null;
    conversionFactor?: number | null;
    confidence?: number | null;
  }) {
    await this.db.$executeRaw(Prisma.sql`
      UPDATE inventory_entry_items
      SET
        product_id = ${input.internalItemId}::uuid,
        supplier_item_mapping_id = ${input.supplierItemMappingId ?? null}::uuid,
        purchase_unit = COALESCE(${normalizeEmpty(input.purchaseUnit ?? undefined)}, purchase_unit),
        conversion_factor = COALESCE(${input.conversionFactor ?? null}, conversion_factor),
        match_status = 'MATCHED',
        match_confidence = ${input.confidence ?? 100}
      WHERE id = ${input.entryItemId}::uuid
        AND inventory_entry_id = ${input.entryId}::uuid
        AND EXISTS (
          SELECT 1
          FROM inventory_entries
          WHERE id = ${input.entryId}::uuid
            AND company_id = ${input.companyId}::uuid
        )
    `);

    const entry = await loadInventoryEntryDetail(this.db, input.companyId, input.entryId);

    if (!entry) {
      throw new Error("Entrada nao encontrada.");
    }

    return entry;
  }

  async createOrUpdateSupplierItemMapping(input: {
    companyId: string;
    supplierId?: string | null;
    supplierDocument?: string | null;
    supplierName?: string | null;
    supplierProductCode?: string | null;
    supplierProductName: string;
    supplierEan?: string | null;
    internalItemId: string;
    purchaseUnit?: string | null;
    stockUnit?: string | null;
    conversionFactor?: number | null;
    confidence?: number | null;
    userId?: string | null;
  }) {
    const existingRows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM supplier_item_mappings
      WHERE company_id = ${input.companyId}::uuid
        AND internal_item_id = ${input.internalItemId}::uuid
        AND COALESCE(supplier_document, '') = COALESCE(${normalizeEmpty(input.supplierDocument ?? undefined)}::varchar, '')
        AND COALESCE(supplier_product_code, '') = COALESCE(${normalizeEmpty(input.supplierProductCode ?? undefined)}::varchar, '')
        AND COALESCE(supplier_ean, '') = COALESCE(${normalizeEmpty(input.supplierEan ?? undefined)}::varchar, '')
        AND LOWER(supplier_product_name) = LOWER(${input.supplierProductName}::varchar)
      LIMIT 1
    `);

    const existingId = existingRows[0]?.id;

    if (existingId) {
      await this.db.$executeRaw(Prisma.sql`
        UPDATE supplier_item_mappings
        SET
          supplier_name = ${normalizeEmpty(input.supplierName ?? undefined)},
          supplier_id = ${input.supplierId ?? null}::uuid,
          purchase_unit = ${normalizeEmpty(input.purchaseUnit ?? undefined)},
          stock_unit = ${normalizeEmpty(input.stockUnit ?? undefined)},
          conversion_factor = ${input.conversionFactor ?? null},
          confidence = ${input.confidence ?? null},
          last_used_at = NOW(),
          updated_by_user_id = ${input.userId ?? null}::uuid
        WHERE id = ${existingId}::uuid
      `);

      return existingId;
    }

    const rows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO supplier_item_mappings (
        company_id,
        supplier_id,
        supplier_document,
        supplier_name,
        supplier_product_code,
        supplier_product_name,
        supplier_ean,
        internal_item_id,
        purchase_unit,
        stock_unit,
        conversion_factor,
        confidence,
        last_used_at,
        created_by_user_id,
        updated_by_user_id
      ) VALUES (
        ${input.companyId}::uuid,
        ${input.supplierId ?? null}::uuid,
        ${normalizeEmpty(input.supplierDocument ?? undefined)},
        ${normalizeEmpty(input.supplierName ?? undefined)},
        ${normalizeEmpty(input.supplierProductCode ?? undefined)},
        ${input.supplierProductName},
        ${normalizeEmpty(input.supplierEan ?? undefined)},
        ${input.internalItemId}::uuid,
        ${normalizeEmpty(input.purchaseUnit ?? undefined)},
        ${normalizeEmpty(input.stockUnit ?? undefined)},
        ${input.conversionFactor ?? null},
        ${input.confidence ?? null},
        NOW(),
        ${input.userId ?? null}::uuid,
        ${input.userId ?? null}::uuid
      )
      RETURNING id
    `);

    return rows[0]?.id ?? null;
  }

  async updateEntryDraft(
    companyId: string,
    entryId: string,
    input: {
      entryType:
        | "PURCHASE_INVOICE"
        | "PURCHASE_WITHOUT_INVOICE"
        | "INITIAL_BALANCE"
        | "RETURN"
        | "BONUS"
        | "OTHER";
      supplierId?: string;
      supplierDocument?: string;
      supplierName?: string;
      documentNumber: string;
      entryDate: Date;
      notes?: string;
      financialCondition: "NONE" | "CASH" | "TERM";
      financialAccountId?: string;
      installmentCount: number;
      firstDueDate?: Date;
      subtotal: number;
      totalAmount: number;
      items: Array<{
        productId: string;
        description: string;
        unit: string;
        quantity: number;
        unitCost: number;
        subtotal: number;
        previousCostPrice?: number;
        previousSalePrice?: number;
        suggestedSalePrice?: number;
        estimatedMarginPercent?: number;
        priceDecision?: string;
        decisionJustification?: string;
        customSalePrice?: number;
      }>;
    },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.inventoryEntryItem.deleteMany({
        where: {
          inventoryEntryId: entryId,
        },
      });

      return tx.inventoryEntry.update({
        where: {
          id: entryId,
          companyId,
        },
        data: {
          entryType: input.entryType,
          supplierId: input.supplierId,
          supplierDocument: normalizeDocument(input.supplierDocument),
          supplierName: normalizeEmpty(input.supplierName),
          documentNumber: input.documentNumber.trim(),
          entryDate: input.entryDate,
          notes: normalizeEmpty(input.notes),
          financialCondition: input.financialCondition,
          financialAccountId: input.financialAccountId,
          installmentCount: input.installmentCount,
          firstDueDate: input.firstDueDate,
          subtotal: input.subtotal,
          totalAmount: input.totalAmount,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              description: item.description.trim(),
              unit: item.unit.trim(),
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.subtotal,
              previousCostPrice: item.previousCostPrice,
              previousSalePrice: item.previousSalePrice,
              suggestedSalePrice: item.suggestedSalePrice,
              estimatedMarginPercent: item.estimatedMarginPercent,
              priceDecision: normalizeEmpty(item.priceDecision),
              decisionJustification: normalizeEmpty(item.decisionJustification),
              customSalePrice: item.customSalePrice,
            })),
          },
        },
        include: inventoryEntryInclude,
      });
    });
  }

  async updateImportedEntryDraft(
    companyId: string,
    entryId: string,
    input: {
      entryType:
        | "PURCHASE_INVOICE"
        | "PURCHASE_WITHOUT_INVOICE"
        | "INITIAL_BALANCE"
        | "RETURN"
        | "BONUS"
        | "OTHER";
      supplierId?: string;
      supplierDocument?: string;
      supplierName?: string;
      documentNumber: string;
      entryDate: Date;
      notes?: string;
      financialCondition: "NONE" | "CASH" | "TERM";
      financialAccountId?: string;
      installmentCount: number;
      firstDueDate?: Date;
      subtotal: number;
      totalAmount: number;
      items: ImportedDraftItemInput[];
    },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.inventoryEntryItem.deleteMany({
        where: {
          inventoryEntryId: entryId,
        },
      });

      await tx.inventoryEntry.update({
        where: {
          id: entryId,
          companyId,
        },
        data: {
          entryType: input.entryType,
          supplierId: input.supplierId,
          supplierDocument: normalizeDocument(input.supplierDocument),
          supplierName: normalizeEmpty(input.supplierName),
          documentNumber: input.documentNumber.trim(),
          entryDate: input.entryDate,
          notes: normalizeEmpty(input.notes),
          financialCondition: input.financialCondition,
          financialAccountId: input.financialAccountId,
          installmentCount: input.installmentCount,
          firstDueDate: input.firstDueDate,
          subtotal: input.subtotal,
          totalAmount: input.totalAmount,
        },
      });

      await insertImportedEntryItems(tx, entryId, input.items);

      const entry = await loadInventoryEntryDetail(tx, companyId, entryId);

      if (!entry) {
        throw new Error("Nao foi possivel atualizar o rascunho da entrada importada.");
      }

      return entry;
    });
  }

  async confirmEntry(input: {
    companyId: string;
    entryId: string;
    confirmedByUserId: string;
    justification?: string;
  }) {
    return this.db.$transaction(async (tx) => {
      const entry = await loadInventoryEntryDetail(tx, input.companyId, input.entryId);

      if (!entry) {
        throw new Error("Entrada nao encontrada.");
      }

      if (entry.status !== "DRAFT") {
        throw new Error("Somente entradas em rascunho podem ser confirmadas.");
      }

      const now = new Date();
      const createdFinancialEntries: string[] = [];

      for (const item of entry.items) {
        if (!item.productId) {
          throw new Error(
            "Esta entrada ainda possui item sem conciliacao com produto interno. Revise os itens antes de confirmar.",
          );
        }

        if (item.matchStatus === "SUGGESTED") {
          throw new Error(
            "Esta entrada ainda possui sugestao de conciliacao aguardando confirmacao explicita. Revise as linhas sugeridas antes de confirmar.",
          );
        }

        await registerInputStock(tx, {
          companyId: input.companyId,
          productId: item.productId,
          quantity: toNumber(item.quantity),
          unitCost: toNumber(item.unitCost),
          reasonCode: resolveEntryReasonCode(
            entry.entryType as Parameters<typeof resolveEntryReasonCode>[0],
          ),
          reasonText: entry.supplierName ?? entry.documentNumber,
          referenceType: "ENTRY",
          referenceId: entry.documentNumber,
          inventoryEntryId: entry.id,
          notes: entry.notes ?? undefined,
          occurredAt: entry.entryDate,
          createdByUserId: input.confirmedByUserId,
          updateReferenceCost: true,
        });

        if (item.previousCostPrice !== null && toNumber(item.previousCostPrice) !== toNumber(item.unitCost)) {
          await tx.productPriceHistory.create({
            data: {
              companyId: input.companyId,
              productId: item.productId,
              changedByUserId: input.confirmedByUserId,
              changeType: "COST",
              previousValue: item.previousCostPrice,
              newValue: item.unitCost,
              origin: "ENTRY_CONFIRMATION",
              relatedDocument: entry.documentNumber,
              justification: normalizeEmpty(input.justification),
            },
          });
        }

        const resolvedSalePrice =
          item.priceDecision === "CUSTOM_PRICE" && item.customSalePrice !== null
            ? toNumber(item.customSalePrice)
            : item.priceDecision === "APPLY_SUGGESTED" && item.suggestedSalePrice !== null
              ? toNumber(item.suggestedSalePrice)
              : null;

        if (
          resolvedSalePrice !== null &&
          item.previousSalePrice !== null &&
          toNumber(item.previousSalePrice) !== resolvedSalePrice
        ) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              salePrice: resolvedSalePrice,
            },
          });

          await tx.productPriceHistory.create({
            data: {
              companyId: input.companyId,
              productId: item.productId,
              changedByUserId: input.confirmedByUserId,
              changeType: "PRICE",
              previousValue: item.previousSalePrice,
              newValue: resolvedSalePrice,
              origin: "ENTRY_CONFIRMATION",
              relatedDocument: entry.documentNumber,
              justification: normalizeEmpty(item.decisionJustification ?? input.justification),
            },
          });
        }
      }

      if (entry.financialCondition !== "NONE" && entry.financialAccountId) {
        const installmentCount = Math.max(entry.installmentCount, 1);
        const firstDueDate = entry.firstDueDate ?? entry.entryDate;
        const totalAmount = toNumber(entry.totalAmount);
        const baseInstallmentAmount = roundCurrency(totalAmount / installmentCount);
        let accumulated = 0;

        for (let index = 0; index < installmentCount; index += 1) {
          const installmentNumber = index + 1;
          const isLastInstallment = installmentNumber === installmentCount;
          const amount = isLastInstallment
            ? roundCurrency(totalAmount - accumulated)
            : baseInstallmentAmount;
          accumulated = roundCurrency(accumulated + amount);

          const dueDate = new Date(firstDueDate);
          dueDate.setMonth(dueDate.getMonth() + index);

          const financialEntry = await tx.financialEntry.create({
            data: {
              companyId: input.companyId,
              accountId: entry.financialAccountId,
              inventoryEntryId: entry.id,
              entryType: entry.financialCondition === "CASH" ? "EXPENSE" : "PAYABLE",
              originType: "ENTRY",
              category: "Entrada de estoque",
              supplierName: normalizeEmpty(entry.supplierName),
              description: `Entrada ${entry.documentNumber}${entry.supplierName ? ` - ${entry.supplierName}` : ""}`,
              amount,
              dueDate,
              paidAt: entry.financialCondition === "CASH" ? now : null,
              installmentNumber,
              installmentCount,
              status: entry.financialCondition === "CASH" ? "PAID" : "PENDING",
              createdByUserId: input.confirmedByUserId,
            },
          });

          createdFinancialEntries.push(financialEntry.id);
        }
      }

      await tx.inventoryEntry.update({
        where: { id: entry.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: now,
          confirmedByUserId: input.confirmedByUserId,
        },
      });

      const confirmedEntry = await loadInventoryEntryDetail(tx, input.companyId, entry.id);

      if (!confirmedEntry) {
        throw new Error("Entrada confirmada mas nao localizada para retorno.");
      }

      return {
        entry: confirmedEntry,
        financialEntryIds: createdFinancialEntries,
      };
    });
  }

  async cancelEntry(input: {
    companyId: string;
    entryId: string;
    canceledByUserId: string;
    justification: string;
  }) {
    return this.db.$transaction(async (tx) => {
      const entry = await tx.inventoryEntry.findFirst({
        where: {
          id: input.entryId,
          companyId: input.companyId,
        },
        include: {
          ...inventoryEntryInclude,
          fifoLayers: true,
        },
      });

      if (!entry) {
        throw new Error("Entrada nao encontrada.");
      }

      if (entry.status !== "CONFIRMED") {
        throw new Error("Somente entradas confirmadas podem ser canceladas.");
      }

      for (const layer of entry.fifoLayers) {
        if (toNumber(layer.availableQuantity) < toNumber(layer.originalQuantity)) {
          throw new Error("Nao e possivel cancelar a entrada porque parte do estoque ja foi consumida.");
        }
      }

      for (const layer of entry.fifoLayers) {
        await registerOutputStockFromSpecificLayers(tx, {
          companyId: input.companyId,
          productId: layer.productId,
          reasonCode: "ENTRY_REVERSAL",
          reasonText: input.justification,
          referenceType: "ENTRY",
          referenceId: entry.documentNumber,
          notes: `Estorno da entrada ${entry.documentNumber}`,
          occurredAt: new Date(),
          createdByUserId: input.canceledByUserId,
          layers: [
            {
              layerId: layer.id,
              quantity: toNumber(layer.originalQuantity),
              unitCost: toNumber(layer.unitCost),
            },
          ],
        });
      }

      await tx.financialEntry.updateMany({
        where: {
          inventoryEntryId: entry.id,
          status: {
            not: "CANCELED",
          },
        },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
        },
      });

      return tx.inventoryEntry.update({
        where: { id: entry.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          canceledByUserId: input.canceledByUserId,
          cancelReason: input.justification,
        },
        include: inventoryEntryInclude,
      });
    });
  }

  async createMovement(input: {
    companyId: string;
    productId: string;
    movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
    reasonCode?:
      | "ADJUSTMENT_POSITIVE"
      | "ADJUSTMENT_NEGATIVE"
      | "LOSS"
      | "DAMAGE"
      | "INTERNAL_CONSUMPTION"
      | "SAMPLE"
      | "DIVERSE_INPUT"
      | "DIVERSE_OUTPUT"
      | "INITIAL_BALANCE"
      | "BONUS"
      | "RETURN";
    reasonText?: string;
    quantity: number;
    unitCost?: number;
    referenceType?: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE" | "ENTRY" | "PRODUCTION";
    referenceId?: string;
    notes?: string;
    createdByUserId: string;
    allowNegativeStock?: boolean;
  }) {
    const movementId = await this.db.$transaction(async (tx) => {
      if (input.movementType === "INPUT") {
        const result = await registerInputStock(tx, {
          companyId: input.companyId,
          productId: input.productId,
          quantity: input.quantity,
          unitCost: input.unitCost ?? 0,
          reasonCode: input.reasonCode ?? "DIVERSE_INPUT",
          reasonText: input.reasonText,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes,
          createdByUserId: input.createdByUserId,
        });

        return result.movement.id;
      }

      if (input.movementType === "ADJUSTMENT") {
        const product = await tx.product.findUnique({
          where: {
            id: input.productId,
          },
        });

        if (!product) {
          throw new Error("Item nao encontrado.");
        }

        const currentStock = toNumber(product.currentStock);
        const targetStock = roundQuantity(input.quantity);
        const difference = roundQuantity(targetStock - currentStock);

        if (difference === 0) {
          throw new Error("O ajuste informado nao altera o saldo atual.");
        }

        if (difference > 0) {
          const result = await registerInputStock(tx, {
            companyId: input.companyId,
            productId: input.productId,
            quantity: difference,
            unitCost: input.unitCost ?? toNumber(product.costPrice),
            reasonCode: input.reasonCode ?? "ADJUSTMENT_POSITIVE",
            reasonText: input.reasonText,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            notes: input.notes,
            createdByUserId: input.createdByUserId,
          });

          return result.movement.id;
        }

        const result = await registerOutputStockByFifo(tx, {
          companyId: input.companyId,
          productId: input.productId,
          quantity: Math.abs(difference),
          reasonCode: input.reasonCode ?? "ADJUSTMENT_NEGATIVE",
          reasonText: input.reasonText,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes,
          createdByUserId: input.createdByUserId,
          allowNegativeStock: input.allowNegativeStock,
        });

        return result.movement.id;
      }

      const result = await registerOutputStockByFifo(tx, {
        companyId: input.companyId,
        productId: input.productId,
        quantity: input.quantity,
        reasonCode: input.reasonCode ?? "DIVERSE_OUTPUT",
        reasonText: input.reasonText,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        notes: input.notes,
        createdByUserId: input.createdByUserId,
        allowNegativeStock: input.allowNegativeStock,
      });

      return result.movement.id;
    });

    return this.db.stockMovement.findUniqueOrThrow({
      where: {
        id: movementId,
      },
      include: {
        product: true,
      },
    });
  }

  async listMovements(companyId: string, productId?: string) {
    return this.db.stockMovement.findMany({
      where: {
        companyId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: true,
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });
  }
}

const inventoryEntryInclude = {
  financialAccount: true,
  items: {
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  financialEntries: true,
} as const;

type ImportedDraftItemInput = {
  productId?: string | null;
  supplierItemMappingId?: string | null;
  lineNumber?: number | null;
  supplierProductCode?: string | null;
  supplierProductName?: string | null;
  supplierEan?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  purchaseUnit?: string | null;
  conversionFactor?: number | null;
  matchStatus?: string | null;
  matchConfidence?: number | null;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  previousCostPrice?: number | null;
  previousSalePrice?: number | null;
  suggestedSalePrice?: number | null;
  estimatedMarginPercent?: number | null;
  priceDecision?: string | null;
  decisionJustification?: string | null;
  customSalePrice?: number | null;
};

async function loadInventoryEntryDetail(
  db: PrismaClient | Prisma.TransactionClient,
  companyId: string,
  entryId: string,
) {
  const rows = await db.$queryRaw<Array<{
    id: string;
    companyId: string;
    entryType: string;
    source: string | null;
    supplierId: string | null;
    supplierName: string | null;
    supplierDocument: string | null;
    documentNumber: string;
    documentSeries: string | null;
    accessKey: string | null;
    issuedAt: Date | null;
    protocol: string | null;
    entryDate: Date;
    notes: string | null;
    financialCondition: string;
    financialAccountId: string | null;
    installmentCount: number;
    firstDueDate: Date | null;
    status: string;
    subtotal: Prisma.Decimal | number;
    totalAmount: Prisma.Decimal | number;
    confirmedAt: Date | null;
    canceledAt: Date | null;
    cancelReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>>(Prisma.sql`
    SELECT
      entry.id,
      entry.company_id AS "companyId",
      entry.entry_type AS "entryType",
      entry.source,
      entry.supplier_id AS "supplierId",
      entry.supplier_name AS "supplierName",
      entry.supplier_document AS "supplierDocument",
      entry.document_number AS "documentNumber",
      entry.document_series AS "documentSeries",
      entry.access_key AS "accessKey",
      entry.issued_at AS "issuedAt",
      entry.protocol,
      entry.entry_date AS "entryDate",
      entry.notes,
      entry.financial_condition AS "financialCondition",
      entry.financial_account_id AS "financialAccountId",
      entry.installment_count AS "installmentCount",
      entry.first_due_date AS "firstDueDate",
      entry.status,
      entry.subtotal,
      entry.total_amount AS "totalAmount",
      entry.confirmed_at AS "confirmedAt",
      entry.canceled_at AS "canceledAt",
      entry.cancel_reason AS "cancelReason",
      entry.created_at AS "createdAt",
      entry.updated_at AS "updatedAt"
    FROM inventory_entries entry
    WHERE entry.company_id = ${companyId}::uuid
      AND entry.id = ${entryId}::uuid
    LIMIT 1
  `);

  const entry = rows[0];
  if (!entry) {
    return null;
  }

  const items = await db.$queryRaw<Array<{
    id: string;
    productId: string | null;
    supplierItemMappingId: string | null;
    lineNumber: number | null;
    supplierProductCode: string | null;
    supplierProductName: string | null;
    supplierEan: string | null;
    ncm: string | null;
    cfop: string | null;
    purchaseUnit: string | null;
    conversionFactor: Prisma.Decimal | number | null;
    matchStatus: string | null;
    matchConfidence: Prisma.Decimal | number | null;
    description: string;
    unit: string;
    quantity: Prisma.Decimal | number;
    unitCost: Prisma.Decimal | number;
    subtotal: Prisma.Decimal | number;
    previousCostPrice: Prisma.Decimal | number | null;
    previousSalePrice: Prisma.Decimal | number | null;
    suggestedSalePrice: Prisma.Decimal | number | null;
    estimatedMarginPercent: Prisma.Decimal | number | null;
    priceDecision: string | null;
    decisionJustification: string | null;
    customSalePrice: Prisma.Decimal | number | null;
    productName: string | null;
  }>>(Prisma.sql`
    SELECT
      item.id,
      item.product_id AS "productId",
      item.supplier_item_mapping_id AS "supplierItemMappingId",
      item.line_number AS "lineNumber",
      item.supplier_product_code AS "supplierProductCode",
      item.supplier_product_name AS "supplierProductName",
      item.supplier_ean AS "supplierEan",
      item.ncm,
      item.cfop,
      item.purchase_unit AS "purchaseUnit",
      item.conversion_factor AS "conversionFactor",
      item.match_status AS "matchStatus",
      item.match_confidence AS "matchConfidence",
      item.description,
      item.unit,
      item.quantity,
      item.unit_cost AS "unitCost",
      item.subtotal,
      item.previous_cost_price AS "previousCostPrice",
      item.previous_sale_price AS "previousSalePrice",
      item.suggested_sale_price AS "suggestedSalePrice",
      item.estimated_margin_percent AS "estimatedMarginPercent",
      item.price_decision AS "priceDecision",
      item.decision_justification AS "decisionJustification",
      item.custom_sale_price AS "customSalePrice",
      product.name AS "productName"
    FROM inventory_entry_items item
    LEFT JOIN products product ON product.id = item.product_id
    WHERE item.inventory_entry_id = ${entryId}::uuid
    ORDER BY item.created_at ASC
  `);

  return {
    ...entry,
    items: items.map((item) => ({
      ...item,
      product: item.productName ? { name: item.productName } : null,
    })),
    attachments: await db.$queryRaw<Array<{
      id: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
      documentType: string | null;
      source: string | null;
      createdAt: Date;
    }>>(Prisma.sql`
      SELECT
        id,
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "fileSize",
        storage_path AS "storagePath",
        document_type AS "documentType",
        source,
        created_at AS "createdAt"
      FROM operational_document_attachments
      WHERE company_id = ${companyId}::uuid
        AND inventory_entry_id = ${entryId}::uuid
      ORDER BY created_at ASC
    `),
    financialEntries: await db.$queryRaw<Array<{
      id: string;
      entryType: "EXPENSE" | "PAYABLE";
      status: string;
      amount: Prisma.Decimal | number;
      dueDate: Date;
      paidAt: Date | null;
      installmentNumber: number | null;
      installmentCount: number | null;
    }>>(Prisma.sql`
      SELECT
        id,
        entry_type AS "entryType",
        status,
        amount,
        due_date AS "dueDate",
        paid_at AS "paidAt",
        installment_number AS "installmentNumber",
        installment_count AS "installmentCount"
      FROM financial_entries
      WHERE company_id = ${companyId}::uuid
        AND inventory_entry_id = ${entryId}::uuid
      ORDER BY due_date ASC, created_at ASC
    `),
  };
}

async function insertImportedEntryItems(
  tx: Prisma.TransactionClient,
  entryId: string,
  items: ImportedDraftItemInput[],
) {
  for (const item of items) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO inventory_entry_items (
        id,
        inventory_entry_id,
        product_id,
        supplier_item_mapping_id,
        line_number,
        supplier_product_code,
        supplier_product_name,
        supplier_ean,
        ncm,
        cfop,
        purchase_unit,
        conversion_factor,
        match_status,
        match_confidence,
        description,
        unit,
        quantity,
        unit_cost,
        subtotal,
        previous_cost_price,
        previous_sale_price,
        suggested_sale_price,
        estimated_margin_percent,
        price_decision,
        decision_justification,
        custom_sale_price
      ) VALUES (
        ${randomUUID()}::uuid,
        ${entryId}::uuid,
        ${item.productId ?? null}::uuid,
        ${item.supplierItemMappingId ?? null}::uuid,
        ${item.lineNumber ?? null},
        ${normalizeEmpty(item.supplierProductCode ?? undefined)},
        ${normalizeEmpty(item.supplierProductName ?? undefined)},
        ${normalizeEmpty(item.supplierEan ?? undefined)},
        ${normalizeEmpty(item.ncm ?? undefined)},
        ${normalizeEmpty(item.cfop ?? undefined)},
        ${normalizeEmpty(item.purchaseUnit ?? undefined)},
        ${item.conversionFactor ?? null},
        ${item.matchStatus ?? "UNMATCHED"},
        ${item.matchConfidence ?? 0},
        ${item.description.trim()},
        ${item.unit.trim()},
        ${item.quantity},
        ${item.unitCost},
        ${item.subtotal},
        ${item.previousCostPrice ?? null},
        ${item.previousSalePrice ?? null},
        ${item.suggestedSalePrice ?? null},
        ${item.estimatedMarginPercent ?? null},
        ${normalizeEmpty(item.priceDecision ?? undefined)},
        ${normalizeEmpty(item.decisionJustification ?? undefined)},
        ${item.customSalePrice ?? null}
      )
    `);
  }
}

function resolveEntryReasonCode(
  entryType:
    | "PURCHASE_INVOICE"
    | "PURCHASE_WITHOUT_INVOICE"
    | "INITIAL_BALANCE"
    | "RETURN"
    | "BONUS"
    | "OTHER",
) {
  switch (entryType) {
    case "INITIAL_BALANCE":
      return "INITIAL_BALANCE" as const;
    case "RETURN":
      return "RETURN" as const;
    case "BONUS":
      return "BONUS" as const;
    default:
      return "ENTRY_CONFIRMATION" as const;
  }
}

function normalizeDocument(value?: string) {
  const trimmed = normalizeEmpty(value);

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replace(/[^0-9a-zA-Z]/g, "");
  return normalized || undefined;
}
