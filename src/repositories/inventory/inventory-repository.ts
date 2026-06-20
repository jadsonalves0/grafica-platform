import type { PrismaClient, Product, ProductCategory } from "@prisma/client";

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
    return this.db.inventoryEntry.findMany({
      where: {
        companyId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { documentNumber: { contains: filters.search, mode: "insensitive" } },
                { supplierName: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: inventoryEntryInclude,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });
  }

  async findEntryById(companyId: string, entryId: string) {
    return this.db.inventoryEntry.findFirst({
      where: {
        id: entryId,
        companyId,
      },
      include: inventoryEntryInclude,
    });
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

  async confirmEntry(input: {
    companyId: string;
    entryId: string;
    confirmedByUserId: string;
    justification?: string;
  }) {
    return this.db.$transaction(async (tx) => {
      const entry = await tx.inventoryEntry.findFirst({
        where: {
          id: input.entryId,
          companyId: input.companyId,
        },
        include: inventoryEntryInclude,
      });

      if (!entry) {
        throw new Error("Entrada nao encontrada.");
      }

      if (entry.status !== "DRAFT") {
        throw new Error("Somente entradas em rascunho podem ser confirmadas.");
      }

      const now = new Date();
      const createdFinancialEntries: string[] = [];

      for (const item of entry.items) {
        await registerInputStock(tx, {
          companyId: input.companyId,
          productId: item.productId,
          quantity: toNumber(item.quantity),
          unitCost: toNumber(item.unitCost),
          reasonCode: resolveEntryReasonCode(entry.entryType),
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

      const confirmedEntry = await tx.inventoryEntry.update({
        where: { id: entry.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: now,
          confirmedByUserId: input.confirmedByUserId,
        },
        include: inventoryEntryInclude,
      });

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
