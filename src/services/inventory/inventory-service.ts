import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { InventoryGroupCreateInputDto } from "@/models/dto/inventory-group-create-input";
import type { InventoryGroupUpdateInputDto } from "@/models/dto/inventory-group-update-input";
import type { CompanyOperationalSettingsUpdateInputDto } from "@/models/dto/company-operational-settings-update-input";
import type { InventoryEntryCancelInputDto } from "@/models/dto/inventory-entry-cancel-input";
import type { InventoryEntryConfirmInputDto } from "@/models/dto/inventory-entry-confirm-input";
import type { InventoryEntryCreateInputDto } from "@/models/dto/inventory-entry-create-input";
import type { InventoryEntryImportXmlInputDto } from "@/models/dto/inventory-entry-import-xml-input";
import type { InventoryEntryImportXmlResultDto } from "@/models/dto/inventory-entry-import-xml-result";
import type { InventoryEntryItemCreateProductInputDto } from "@/models/dto/inventory-entry-item-create-product-input";
import type { InventoryEntryItemMatchInputDto } from "@/models/dto/inventory-entry-item-match-input";
import type { InventoryPurchaseListCreateEntryInputDto } from "@/models/dto/inventory-purchase-list-create-entry-input";
import type { InventoryEntryUpdateInputDto } from "@/models/dto/inventory-entry-update-input";
import type { InventoryMovementCreateInputDto } from "@/models/dto/inventory-movement-create-input";
import type { InventoryProductCreateInputDto } from "@/models/dto/inventory-product-create-input";
import type { InventoryProductUpdateInputDto } from "@/models/dto/inventory-product-update-input";
import { parseNfeXml } from "@/lib/inventory/nfe-xml-parser";
import {
  deleteOperationalDocument,
  saveOperationalDocument,
} from "@/lib/storage/operational-documents";
import { AuditRepository } from "@/repositories/audit/audit-repository";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class InventoryService extends BaseService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditRepository: AuditRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async getOperationalSettings(
    context: TenantContext & { permissions: string[] },
    companyId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view parameters inside your company.");
    }

    return this.inventoryRepository.getOperationalSettings(companyId);
  }

  async updateOperationalSettings(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    input: CompanyOperationalSettingsUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update parameters inside your company.");
    }

    const previousSettings = await this.inventoryRepository.getOperationalSettings(companyId);
    const updatedSettings = await this.inventoryRepository.updateOperationalSettings(companyId, {
      defaultMarginPercent: normalizeMargin(input.defaultMarginPercent) ?? 30,
      minimumMarginPercent: normalizeMargin(input.minimumMarginPercent) ?? 10,
      costVariationAlertPercent: normalizeMargin(input.costVariationAlertPercent) ?? 10,
      regularDiscountLimitPercent: normalizeMargin(input.regularDiscountLimitPercent) ?? 5,
      managerDiscountLimitPercent: normalizeMargin(input.managerDiscountLimitPercent) ?? 15,
      allowNegativeStock: input.allowNegativeStock,
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "company_operational_settings",
      recordId: updatedSettings.id,
      action: "UPDATE",
      previousData: JSON.stringify(mapOperationalSettings(previousSettings)),
      newData: JSON.stringify(mapOperationalSettings(updatedSettings)),
    });

    return updatedSettings;
  }

  async createGroup(
    context: TenantContext & { permissions: string[] },
    input: InventoryGroupCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create groups inside your company.");
    }

    const duplicatedGroup = await this.inventoryRepository.findGroupByName(
      input.companyId,
      input.name,
    );

    if (duplicatedGroup) {
      throw new Error("Ja existe um grupo com esse nome nesta empresa.");
    }

    return this.inventoryRepository.createGroup({
      companyId: input.companyId,
      name: input.name.trim(),
      description: input.description,
      defaultMargin: normalizeMargin(input.defaultMargin),
      showOnWebsite: Boolean(input.showOnWebsite),
      isActive: input.isActive ?? true,
    });
  }

  async listGroups(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view groups inside your company.");
    }

    return this.inventoryRepository.listGroups(companyId, search?.trim() || undefined);
  }

  async getGroup(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    groupId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view groups inside your company.");
    }

    const group = await this.inventoryRepository.findGroupById(companyId, groupId);

    if (!group) {
      throw new Error("Grupo de itens nao encontrado.");
    }

    return group;
  }

  async updateGroup(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    groupId: string,
    input: InventoryGroupUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update groups inside your company.");
    }

    const group = await this.inventoryRepository.findGroupById(companyId, groupId);

    if (!group) {
      throw new Error("Grupo de itens nao encontrado.");
    }

    const duplicatedGroup = await this.inventoryRepository.findGroupByNameExcludingId(
      companyId,
      input.name,
      groupId,
    );

    if (duplicatedGroup) {
      throw new Error("Ja existe um grupo com esse nome nesta empresa.");
    }

    return this.inventoryRepository.updateGroup(groupId, {
      name: input.name.trim(),
      description: input.description,
      defaultMargin: normalizeMargin(input.defaultMargin),
      showOnWebsite: Boolean(input.showOnWebsite),
      isActive: input.isActive ?? true,
    });
  }

  async createProduct(
    context: TenantContext & { permissions: string[] },
    input: InventoryProductCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.inventoryCreate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create products inside your company.");
    }

    const category = await this.validateCategory(input.companyId, input.categoryId);

    const normalizedSku = input.sku?.trim();
    if (normalizedSku) {
      const existingBySku = await this.inventoryRepository.findProductBySku(
        input.companyId,
        normalizedSku,
      );

      if (existingBySku) {
        throw new Error("An item with this SKU already exists in this company.");
      }
    }

    const normalizedBarcode = input.barcode?.trim();
    if (normalizedBarcode) {
      const existingByBarcode = await this.inventoryRepository.findProductByBarcode(
        input.companyId,
        normalizedBarcode,
      );

      if (existingByBarcode) {
        throw new Error("An item with this EAN/GTIN already exists in this company.");
      }
    }

    const costPrice = roundCurrency(input.costPrice ?? 0);
    const salePrice = roundCurrency(input.salePrice ?? 0);

    return this.inventoryRepository.createProduct({
      ...input,
      categoryId: input.categoryId,
      type: input.type,
      controlsStock: resolveControlsStock(input.type, input.controlsStock),
      showOnWebsite: Boolean(input.showOnWebsite),
      desiredMargin: resolveDesiredMargin(input.desiredMargin, category?.defaultMargin),
      costPrice,
      salePrice,
      minimumStock: roundQuantity(input.minimumStock ?? 0),
      historyEntries: buildCreateHistoryEntries({
        companyId: input.companyId,
        userId: tenantContext.userId,
        costPrice,
        salePrice,
      }),
    });
  }

  async listProducts(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
    categoryId?: string,
    options?: {
      onlyActive?: boolean;
      limit?: number;
    },
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view inventory inside your company.");
    }

    return this.inventoryRepository.listProducts(
      companyId,
      search?.trim() || undefined,
      categoryId,
      options,
    );
  }

  async listPurchaseSuggestions(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
    categoryId?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view purchase suggestions inside your company.");
    }

    const products = await this.inventoryRepository.listProducts(
      companyId,
      search?.trim() || undefined,
      categoryId,
      {
        onlyActive: true,
      },
    );

    const candidates = products
      .filter((product) => product.controlsStock)
      .map((product) => {
        const currentStock = toNumber(product.currentStock);
        const availableStock = computeAvailableStockFromProduct(product);
        const minimumStock = toNumber(product.minimumStock);
        const shortageQuantity =
          availableStock <= minimumStock
            ? roundQuantity(Math.max(minimumStock - availableStock, 0))
            : 0;

        return {
          product,
          currentStock,
          availableStock,
          minimumStock,
          shortageQuantity,
          hasStockMismatch: Math.abs(currentStock - availableStock) > 0.0001,
        };
      })
      .filter((candidate) => candidate.shortageQuantity > 0);

    const mappings = await this.inventoryRepository.listLatestSupplierMappingsForProductIds(
      companyId,
      candidates.map((candidate) => candidate.product.id),
    );
    const mappingsByProductId = new Map(
      mappings.map((mapping) => [mapping.internalItemId, mapping]),
    );

    return candidates.map((candidate) => {
      const mapping = mappingsByProductId.get(candidate.product.id) ?? null;
      const conversionFactor =
        mapping?.conversionFactor === null || mapping?.conversionFactor === undefined
          ? null
          : toNumber(mapping.conversionFactor);
      const suggestedPurchaseQuantity =
        conversionFactor && conversionFactor > 0
          ? roundQuantity(candidate.shortageQuantity / conversionFactor)
          : candidate.shortageQuantity;

      return {
        product: candidate.product,
        currentStock: candidate.currentStock,
        availableStock: candidate.availableStock,
        minimumStock: candidate.minimumStock,
        shortageQuantity: candidate.shortageQuantity,
        suggestedPurchaseQuantity,
        estimatedPurchaseValue: roundCurrency(
          candidate.shortageQuantity * toNumber(candidate.product.costPrice),
        ),
        hasStockMismatch: candidate.hasStockMismatch,
        preferredSupplierId: mapping?.supplierId ?? null,
        preferredSupplierName: mapping?.supplierName ?? null,
        preferredSupplierDocument: mapping?.supplierDocument ?? null,
        supplierProductCode: mapping?.supplierProductCode ?? null,
        purchaseUnit: mapping?.purchaseUnit ?? null,
        conversionFactor,
        lastSupplierUseAt: mapping?.lastUsedAt ?? null,
      };
    });
  }

  async createPurchaseSuggestionEntryDraft(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    productId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only create purchase drafts inside your company.");
    }

    const suggestions = await this.listPurchaseSuggestions(context, companyId);
    const suggestion = suggestions.find((item) => item.product.id === productId);

    if (!suggestion) {
      throw new Error(
        "Este item nao possui reposicao sugerida no momento. Revise o estoque minimo e o saldo disponivel antes de gerar a pre-entrada.",
      );
    }

    const entry = await this.createPurchaseSuggestionDraftFromSuggestions(context, companyId, [
      suggestion,
    ]);

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_purchase_suggestion",
      recordId: entry.id,
      action: "CREATE",
      newData: JSON.stringify({
        productId: suggestion.product.id,
        supplierName: suggestion.preferredSupplierName ?? null,
        suggestedPurchaseQuantity: suggestion.suggestedPurchaseQuantity,
        shortageQuantity: suggestion.shortageQuantity,
        generatedEntryId: entry.id,
      }),
    });

    return entry;
  }

  async createPurchaseListEntryDraft(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    input: InventoryPurchaseListCreateEntryInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only create purchase drafts inside your company.");
    }

    const selectedProductIds = [...new Set(input.productIds.filter(Boolean))];
    const suggestions = await this.listPurchaseSuggestions(context, companyId);
    const selectedSuggestions = suggestions.filter((item) =>
      selectedProductIds.includes(item.product.id),
    );

    if (selectedSuggestions.length !== selectedProductIds.length) {
      throw new Error(
        "Um ou mais itens selecionados nao possuem reposicao sugerida no momento. Atualize a lista antes de gerar a pre-entrada.",
      );
    }

    const distinctGroupKeys = new Set(
      selectedSuggestions.map((item) => buildPurchaseSuggestionGroupKey(item)),
    );

    if (distinctGroupKeys.size > 1) {
      throw new Error(
        "A pre-entrada em lote precisa usar itens do mesmo fornecedor. Gere uma pre-entrada por grupo da lista de compra.",
      );
    }

    const informedGroupKey = buildPurchaseSuggestionGroupKey({
      preferredSupplierId: input.supplierId ?? null,
      preferredSupplierName: input.supplierName ?? null,
      preferredSupplierDocument: input.supplierDocument ?? null,
    });

    if (distinctGroupKeys.size === 1 && !distinctGroupKeys.has(informedGroupKey)) {
      throw new Error(
        "Os itens selecionados nao pertencem ao grupo de fornecedor informado. Atualize a lista e tente novamente.",
      );
    }

    const entry = await this.createPurchaseSuggestionDraftFromSuggestions(
      context,
      companyId,
      selectedSuggestions,
    );

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_purchase_list",
      recordId: entry.id,
      action: "CREATE",
      newData: JSON.stringify({
        supplierName: input.supplierName?.trim() || null,
        supplierDocument: input.supplierDocument?.trim() || null,
        productIds: selectedProductIds,
        generatedEntryId: entry.id,
      }),
    });

    return entry;
  }

  async buildPurchaseList(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    options?: {
      search?: string;
      categoryId?: string;
      productIds?: string[];
    },
  ) {
    const suggestions = await this.listPurchaseSuggestions(
      context,
      companyId,
      options?.search,
      options?.categoryId,
    );
    const selectedProductIds = [...new Set((options?.productIds ?? []).filter(Boolean))];
    const filteredSuggestions =
      selectedProductIds.length > 0
        ? suggestions.filter((item) => selectedProductIds.includes(item.product.id))
        : suggestions;
    const selectionMode: "FILTERED" | "SELECTED" =
      selectedProductIds.length > 0 ? "SELECTED" : "FILTERED";

    const grouped = new Map<
      string,
      {
        supplierId: string | null;
        supplierName: string;
        supplierDocument: string | null;
        hasMappedSupplier: boolean;
        estimatedPurchaseValue: number;
        items: typeof filteredSuggestions;
      }
    >();

    for (const suggestion of filteredSuggestions) {
      const groupKey = buildPurchaseSuggestionGroupKey(suggestion);
      const existingGroup = grouped.get(groupKey);

      if (existingGroup) {
        existingGroup.items.push(suggestion);
        existingGroup.estimatedPurchaseValue = roundCurrency(
          existingGroup.estimatedPurchaseValue + suggestion.estimatedPurchaseValue,
        );
        continue;
      }

      grouped.set(groupKey, {
        supplierId: suggestion.preferredSupplierId ?? null,
        supplierName: suggestion.preferredSupplierName?.trim() || "Sem fornecedor definido",
        supplierDocument: suggestion.preferredSupplierDocument?.trim() || null,
        hasMappedSupplier: Boolean(
          suggestion.preferredSupplierName || suggestion.preferredSupplierDocument,
        ),
        estimatedPurchaseValue: roundCurrency(suggestion.estimatedPurchaseValue),
        items: [suggestion],
      });
    }

    const groups = [...grouped.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) =>
          left.product.name.localeCompare(right.product.name, "pt-BR"),
        ),
      }))
      .sort((left, right) => {
        if (left.hasMappedSupplier !== right.hasMappedSupplier) {
          return left.hasMappedSupplier ? -1 : 1;
        }

        return left.supplierName.localeCompare(right.supplierName, "pt-BR");
      });

    return {
      generatedAt: new Date(),
      selectionMode: selectedProductIds.length > 0 ? "SELECTED" : "FILTERED",
      filters: {
        search: options?.search?.trim() || null,
        categoryId: options?.categoryId?.trim() || null,
        productIds: selectedProductIds,
      },
      totalItems: filteredSuggestions.length,
      totalGroups: groups.length,
      estimatedPurchaseValue: roundCurrency(
        filteredSuggestions.reduce((sum, item) => sum + item.estimatedPurchaseValue, 0),
      ),
      missingSupplierItems: filteredSuggestions.filter(
        (item) => !item.preferredSupplierName && !item.preferredSupplierDocument,
      ).length,
      mismatchedItems: filteredSuggestions.filter((item) => item.hasStockMismatch).length,
      groups,
    };
  }

  private async createPurchaseSuggestionDraftFromSuggestions(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    suggestions: Array<
      Awaited<ReturnType<InventoryService["listPurchaseSuggestions"]>>[number]
    >,
  ) {
    if (suggestions.length === 0) {
      throw new Error("Nenhum item valido foi informado para gerar a pre-entrada.");
    }

    const supplierName = suggestions[0].preferredSupplierName?.trim() || undefined;
    const supplierId = suggestions[0].preferredSupplierId?.trim() || undefined;
    const supplierDocument = suggestions[0].preferredSupplierDocument?.trim() || undefined;
    const now = new Date();
    const documentNumber = generatePurchaseSuggestionDocumentNumber(now);
    const noteParts = [
      suggestions.length > 1
        ? "Pre-entrada gerada a partir da lista de compra."
        : "Pre-entrada gerada a partir de sugestao de compra.",
    ];

    for (const suggestion of suggestions) {
      const itemParts = [
        `${suggestion.product.name}: ${formatQuantityForNote(suggestion.shortageQuantity)} ${suggestion.product.unit}`,
      ];

      if (suggestion.purchaseUnit && suggestion.conversionFactor) {
        itemParts.push(
          `referencia ${formatQuantityForNote(suggestion.suggestedPurchaseQuantity)} ${suggestion.purchaseUnit} (1 ${suggestion.purchaseUnit} = ${formatQuantityForNote(suggestion.conversionFactor)} ${suggestion.product.unit})`,
        );
      }

      if (suggestion.supplierProductCode) {
        itemParts.push(`cod. fornecedor ${suggestion.supplierProductCode}`);
      }

      noteParts.push(itemParts.join(", ") + ".");
    }

    return this.createEntry(context, {
        companyId,
        entryType: "PURCHASE_WITHOUT_INVOICE",
        supplierId,
        supplierDocument,
        supplierName,
        documentNumber,
      entryDate: now.toISOString().slice(0, 10),
      notes: noteParts.join(" "),
      financialCondition: "NONE",
      items: suggestions.map((suggestion) => ({
        productId: suggestion.product.id,
        description: suggestion.product.name,
        unit: suggestion.product.unit,
        quantity: suggestion.shortageQuantity,
        unitCost: Math.max(roundCurrency(toNumber(suggestion.product.costPrice)), 0),
      })),
    });
  }

  async getProduct(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    productId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view inventory inside your company.");
    }

    const product = await this.inventoryRepository.findProductById(companyId, productId);

    if (!product) {
      throw new Error("Product not found.");
    }

    return product;
  }

  async updateProduct(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    productId: string,
    input: InventoryProductUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update products inside your company.");
    }

    const existingProduct = await this.inventoryRepository.findProductById(companyId, productId);

    if (!existingProduct) {
      throw new Error("Product not found.");
    }

    const category = await this.validateCategory(companyId, input.categoryId);

    const normalizedSku = input.sku?.trim();
    if (normalizedSku) {
      const existingBySku = await this.inventoryRepository.findProductBySkuExcludingId(
        companyId,
        normalizedSku,
        productId,
      );

      if (existingBySku) {
        throw new Error("An item with this SKU already exists in this company.");
      }
    }

    const normalizedBarcode = input.barcode?.trim();
    if (normalizedBarcode) {
      const existingByBarcode = await this.inventoryRepository.findProductByBarcodeExcludingId(
        companyId,
        normalizedBarcode,
        productId,
      );

      if (existingByBarcode) {
        throw new Error("An item with this EAN/GTIN already exists in this company.");
      }
    }

    const costPrice = roundCurrency(input.costPrice ?? 0);
    const salePrice = roundCurrency(input.salePrice ?? 0);

    const updatedProduct = await this.inventoryRepository.updateProduct(companyId, productId, {
      ...input,
      categoryId: input.categoryId,
      type: input.type,
      controlsStock: resolveControlsStock(input.type, input.controlsStock),
      showOnWebsite: Boolean(input.showOnWebsite),
      desiredMargin: resolveDesiredMargin(input.desiredMargin, category?.defaultMargin),
      costPrice,
      salePrice,
      minimumStock: roundQuantity(input.minimumStock ?? 0),
      historyEntries: buildUpdateHistoryEntries({
        companyId,
        productId,
        userId: tenantContext.userId,
        previousCostPrice: toNumber(existingProduct.costPrice),
        previousSalePrice: toNumber(existingProduct.salePrice),
        costPrice,
        salePrice,
      }),
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "product",
      recordId: productId,
      action: "UPDATE",
      previousData: JSON.stringify({
        name: existingProduct.name,
        sku: existingProduct.sku,
        barcode: existingProduct.barcode,
        categoryId: existingProduct.categoryId,
        type: existingProduct.type,
        controlsStock: existingProduct.controlsStock,
        showOnWebsite: existingProduct.showOnWebsite,
        desiredMargin: existingProduct.desiredMargin ? toNumber(existingProduct.desiredMargin) : null,
        costPrice: toNumber(existingProduct.costPrice),
        salePrice: toNumber(existingProduct.salePrice),
        minimumStock: toNumber(existingProduct.minimumStock),
      }),
      newData: JSON.stringify({
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        barcode: updatedProduct.barcode,
        categoryId: updatedProduct.categoryId,
        type: updatedProduct.type,
        controlsStock: updatedProduct.controlsStock,
        showOnWebsite: updatedProduct.showOnWebsite,
        desiredMargin: updatedProduct.desiredMargin ? toNumber(updatedProduct.desiredMargin) : null,
        costPrice: toNumber(updatedProduct.costPrice),
        salePrice: toNumber(updatedProduct.salePrice),
        minimumStock: toNumber(updatedProduct.minimumStock),
      }),
    });

    return updatedProduct;
  }

  async createEntry(
    context: TenantContext & { permissions: string[] },
    input: InventoryEntryCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create entries inside your company.");
    }

    const resolvedSupplier = await this.resolveEntrySupplier(input.companyId, {
      supplierId: input.supplierId,
      supplierDocument: input.supplierDocument,
      supplierName: input.supplierName,
    });

    const duplicatedDocument = await this.inventoryRepository.findDuplicatedEntryDocument(
      input.companyId,
      {
        supplierName: resolvedSupplier.supplierName ?? undefined,
        entryType: input.entryType,
        documentNumber: input.documentNumber,
      },
    );

    if (duplicatedDocument) {
      throw new Error("Ja existe uma entrada com esse fornecedor, tipo e numero de documento.");
    }

    const normalized = await this.normalizeEntryPayload(input.companyId, input);
    const entry = await this.inventoryRepository.createEntry({
      companyId: input.companyId,
      entryType: input.entryType,
      supplierId: resolvedSupplier.supplierId ?? undefined,
      supplierDocument: resolvedSupplier.supplierDocument ?? undefined,
      supplierName: resolvedSupplier.supplierName ?? undefined,
      documentNumber: input.documentNumber.trim(),
      entryDate: parseRequiredDate(input.entryDate, "data da entrada"),
      notes: input.notes?.trim(),
      financialCondition: input.financialCondition ?? "NONE",
      financialAccountId: input.financialAccountId,
      installmentCount: input.installmentCount ?? 1,
      firstDueDate: input.firstDueDate
        ? parseRequiredDate(input.firstDueDate, "primeiro vencimento")
        : undefined,
      subtotal: normalized.subtotal,
      totalAmount: normalized.totalAmount,
      items: normalized.items,
    });

    await this.auditRepository.create({
      companyId: input.companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry",
      recordId: entry.id,
      action: "CREATE",
      newData: JSON.stringify({
        documentNumber: entry.documentNumber,
        entryType: entry.entryType,
        supplierName: entry.supplierName,
        totalAmount: toNumber(entry.totalAmount),
        itemsCount: entry.items.length,
      }),
    });

    return entry;
  }

  async importEntryXml(
    context: TenantContext & { permissions: string[] },
    input: InventoryEntryImportXmlInputDto,
  ): Promise<InventoryEntryImportXmlResultDto> {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only import entries inside your company.");
    }

    const parsedDocument = parseNfeXml(input.xmlContent);
    const resolvedSupplier = await this.resolveEntrySupplier(input.companyId, {
      supplierDocument: parsedDocument.supplierDocument,
      supplierName: parsedDocument.supplierName,
    });

    if (parsedDocument.accessKey) {
      const duplicatedByAccessKey = await this.inventoryRepository.findEntryByAccessKey(
        input.companyId,
        parsedDocument.accessKey,
      );

      if (duplicatedByAccessKey) {
        throw new Error(
          "Ja existe uma entrada registrada com esta chave de acesso. Abra a entrada existente ou importe outro documento.",
        );
      }
    }

    const duplicatedDocument = await this.inventoryRepository.findDuplicatedEntryDocument(
      input.companyId,
      {
        supplierName: resolvedSupplier.supplierName ?? parsedDocument.supplierName ?? undefined,
        entryType: "PURCHASE_INVOICE",
        documentNumber: parsedDocument.number,
      },
    );

    if (duplicatedDocument) {
      throw new Error(
        "Ja existe uma entrada registrada com esta chave de acesso. Abra a entrada existente ou importe outro documento.",
      );
    }

    const matchedItems: ImportedEntryMatchResult[] = [];
    for (const item of parsedDocument.items) {
      matchedItems.push(
        await this.resolveImportedItemMatch(input.companyId, {
          supplierDocument: parsedDocument.supplierDocument,
          supplierName: parsedDocument.supplierName,
          supplierProductCode: item.supplierProductCode,
          supplierProductName: item.description,
          supplierEan: item.ean,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          lineNumber: item.lineNumber,
          ncm: item.ncm,
          cfop: item.cfop,
          additionalInfo: item.additionalInfo,
        }),
      );
    }

    const entry = await this.inventoryRepository.createImportedEntryDraft({
      companyId: input.companyId,
      entryType: "PURCHASE_INVOICE",
      supplierId: resolvedSupplier.supplierId,
      supplierName: resolvedSupplier.supplierName ?? parsedDocument.supplierName,
      supplierDocument: resolvedSupplier.supplierDocument ?? parsedDocument.supplierDocument,
      documentNumber: parsedDocument.number,
      documentSeries: parsedDocument.series,
      accessKey: parsedDocument.accessKey,
      issuedAt: parsedDocument.issuedAt ? new Date(parsedDocument.issuedAt) : null,
      protocol: parsedDocument.protocol,
      entryDate: parsedDocument.receivedAt
        ? new Date(parsedDocument.receivedAt)
        : parsedDocument.issuedAt
          ? new Date(parsedDocument.issuedAt)
          : new Date(),
      notes: buildImportedEntryNotes(parsedDocument),
      subtotal: roundCurrency(parsedDocument.productsAmount || parsedDocument.totalAmount),
      totalAmount: roundCurrency(parsedDocument.totalAmount || parsedDocument.productsAmount),
      items: matchedItems.map((item) => ({
        productId: item.productId,
        supplierItemMappingId: item.supplierItemMappingId,
        lineNumber: item.lineNumber,
        supplierProductCode: item.supplierProductCode,
        supplierProductName: item.supplierProductName,
        supplierEan: item.supplierEan,
        ncm: item.ncm,
        cfop: item.cfop,
        description: item.description,
        purchaseUnit: item.purchaseUnit,
        unit: item.unit,
        conversionFactor: item.conversionFactor,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.subtotal,
        previousCostPrice: item.previousCostPrice,
        previousSalePrice: item.previousSalePrice,
        suggestedSalePrice: item.suggestedSalePrice,
        estimatedMarginPercent: item.estimatedMarginPercent,
        priceDecision: item.priceDecision,
        matchStatus: item.matchStatus,
        matchConfidence: item.matchConfidence,
      })),
    });

    const savedDocument = await saveOperationalDocument({
      companyId: input.companyId,
      entityType: "inventory-entry",
      entityId: entry.id,
      fileName: input.fileName?.trim() || `nfe-${parsedDocument.number}.xml`,
      content: Buffer.from(input.xmlContent, "utf-8"),
    });

    await this.inventoryRepository.createAttachment({
      companyId: input.companyId,
      inventoryEntryId: entry.id,
      entityType: "inventory-entry",
      entityId: entry.id,
      fileName: input.fileName?.trim() || `nfe-${parsedDocument.number}.xml`,
      mimeType: input.mimeType?.trim() || "application/xml",
      fileSize: Buffer.byteLength(input.xmlContent, "utf-8"),
      storagePath: savedDocument.storagePath,
      documentType: "XML_NFE",
      source: "XML_IMPORT",
      createdByUserId: tenantContext.userId,
    });

    await this.auditRepository.create({
      companyId: input.companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry_import",
      recordId: entry.id,
      action: "CREATE",
      newData: JSON.stringify({
        accessKey: parsedDocument.accessKey,
        documentNumber: parsedDocument.number,
        supplierName: parsedDocument.supplierName,
        itemsCount: matchedItems.length,
      }),
    });

    return {
      draftEntryId: entry.id,
      document: {
        accessKey: parsedDocument.accessKey,
        number: parsedDocument.number,
        series: parsedDocument.series,
        issuedAt: parsedDocument.issuedAt,
        supplierName: parsedDocument.supplierName,
        supplierDocument: parsedDocument.supplierDocument,
        totalAmount: roundCurrency(parsedDocument.totalAmount),
        protocol: parsedDocument.protocol,
      },
      items: entry.items.map((item, index) => ({
        entryItemId: item.id,
        lineNumber: matchedItems[index]?.lineNumber ?? null,
        supplierProductCode: matchedItems[index]?.supplierProductCode ?? null,
        description: item.description,
        ean: matchedItems[index]?.supplierEan ?? null,
        quantity: toNumber(item.quantity),
        unit: item.unit,
        unitPrice: toNumber(item.unitCost),
        totalPrice: toNumber(item.subtotal),
        matchedItemId: matchedItems[index]?.productId ?? null,
        matchedItemName: matchedItems[index]?.productName ?? null,
        matchStatus: matchedItems[index]?.matchStatus ?? "UNMATCHED",
        matchConfidence: matchedItems[index]?.matchConfidence ?? 0,
        warnings: matchedItems[index]?.warnings ?? [],
      })),
      warnings: parsedDocument.warnings,
    };
  }

  async listEntries(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
    status?: "DRAFT" | "CONFIRMED" | "CANCELED",
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view entries inside your company.");
    }

    return this.inventoryRepository.listEntries(companyId, {
      search: search?.trim() || undefined,
      status,
    });
  }

  async getEntry(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view entries inside your company.");
    }

    const entry = await this.inventoryRepository.findEntryById(companyId, entryId);

    if (!entry) {
      throw new Error("Entrada nao encontrada.");
    }

    return entry;
  }

  async getEntryAttachment(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    attachmentId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view entry attachments inside your company.");
    }

    const attachment = await this.inventoryRepository.findEntryAttachment(
      companyId,
      entryId,
      attachmentId,
    );

    if (!attachment) {
      throw new Error("Anexo da entrada nao encontrado.");
    }

    return attachment;
  }

  async addEntryAttachment(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    input: {
      fileName: string;
      mimeType: string;
      fileSize: number;
      content: Buffer | Uint8Array;
      documentType?: string | null;
      source?: string | null;
    },
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update entry attachments inside your company.");
    }

    const entry = await this.inventoryRepository.findEntryById(companyId, entryId);
    if (!entry) {
      throw new Error("Entrada nao encontrada.");
    }

    if (entry.status === "CANCELED") {
      throw new Error("Entradas canceladas nao aceitam novos anexos operacionais.");
    }

    validateOperationalAttachment({
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    });

    const savedDocument = await saveOperationalDocument({
      companyId,
      entityType: "inventory-entry",
      entityId: entryId,
      fileName: input.fileName,
      content: input.content,
    });

    const attachment = await this.inventoryRepository.createAttachment({
      companyId,
      inventoryEntryId: entryId,
      entityType: "inventory-entry",
      entityId: entryId,
      fileName: savedDocument.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      storagePath: savedDocument.storagePath,
      documentType: input.documentType ?? "OTHER",
      source: input.source ?? "MANUAL_UPLOAD",
      createdByUserId: tenantContext.userId,
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry_attachment",
      recordId: attachment?.id ?? entryId,
      action: "CREATE",
      newData: JSON.stringify({
        inventoryEntryId: entryId,
        fileName: attachment?.fileName ?? savedDocument.fileName,
        documentType: input.documentType ?? "OTHER",
        source: input.source ?? "MANUAL_UPLOAD",
      }),
    });

    const updatedEntry = await this.inventoryRepository.findEntryById(companyId, entryId);

    if (!updatedEntry) {
      throw new Error("Anexo salvo, mas nao foi possivel recarregar a entrada.");
    }

    return updatedEntry;
  }

  async removeEntryAttachment(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    attachmentId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update entry attachments inside your company.");
    }

    const entry = await this.inventoryRepository.findEntryById(companyId, entryId);
    if (!entry) {
      throw new Error("Entrada nao encontrada.");
    }

    const attachment = await this.inventoryRepository.findEntryAttachment(
      companyId,
      entryId,
      attachmentId,
    );

    if (!attachment) {
      throw new Error("Anexo da entrada nao encontrado.");
    }

    if (attachment.source === "XML_IMPORT" && attachment.documentType === "XML_NFE") {
      throw new Error(
        "O XML original importado faz parte do historico da entrada e nao pode ser removido.",
      );
    }

    const deletedAttachment = await this.inventoryRepository.deleteEntryAttachment(
      companyId,
      entryId,
      attachmentId,
    );

    if (!deletedAttachment) {
      throw new Error("Nao foi possivel remover o anexo da entrada.");
    }

    await deleteOperationalDocument(deletedAttachment.storagePath);

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry_attachment",
      recordId: deletedAttachment.id,
      action: "CANCEL",
      previousData: JSON.stringify({
        inventoryEntryId: entryId,
        fileName: deletedAttachment.fileName,
        documentType: deletedAttachment.documentType,
        source: deletedAttachment.source,
      }),
    });

    const updatedEntry = await this.inventoryRepository.findEntryById(companyId, entryId);

    if (!updatedEntry) {
      throw new Error("Anexo removido, mas nao foi possivel recarregar a entrada.");
    }

    return updatedEntry;
  }

  async matchEntryItem(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    entryItemId: string,
    input: InventoryEntryItemMatchInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update entries inside your company.");
    }

    const entry = await this.inventoryRepository.findEntryById(companyId, entryId);
    if (!entry) {
      throw new Error("Entrada nao encontrada.");
    }

    if (entry.status !== "DRAFT") {
      throw new Error("Somente entradas em rascunho podem ter itens conciliados.");
    }

    const item = entry.items.find((entryItem) => entryItem.id === entryItemId);
    if (!item) {
      throw new Error("Item da entrada nao encontrado.");
    }

    const product = await this.inventoryRepository.findProductById(companyId, input.internalItemId);
    if (!product) {
      throw new Error("Item interno nao encontrado.");
    }

    const entryWithImportMetadata = entry as typeof entry & {
      supplierDocument?: string | null;
    };
    const itemWithImportMetadata = item as typeof item & {
      supplierProductCode?: string | null;
      supplierEan?: string | null;
      purchaseUnit?: string | null;
    };

    let supplierItemMappingId: string | null = null;

    if (input.saveSupplierMapping) {
      supplierItemMappingId = await this.inventoryRepository.createOrUpdateSupplierItemMapping({
        companyId,
        supplierId: entry.supplierId ?? null,
        supplierDocument: entryWithImportMetadata.supplierDocument ?? null,
        supplierName: entry.supplierName ?? null,
        supplierProductCode: itemWithImportMetadata.supplierProductCode ?? null,
        supplierProductName: item.description,
        supplierEan: itemWithImportMetadata.supplierEan ?? null,
        internalItemId: product.id,
        purchaseUnit: input.purchaseUnit || itemWithImportMetadata.purchaseUnit || null,
        stockUnit: input.stockUnit || product.unit,
        conversionFactor: input.conversionFactor,
        confidence: input.confidence ?? 100,
        userId: tenantContext.userId,
      });
    }

    const updatedEntry = await this.inventoryRepository.matchEntryItem({
      companyId,
      entryId,
      entryItemId,
      internalItemId: product.id,
      supplierItemMappingId,
      purchaseUnit: input.purchaseUnit || itemWithImportMetadata.purchaseUnit || null,
      conversionFactor: input.conversionFactor,
      confidence: input.confidence ?? 100,
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry_item_match",
      recordId: entryItemId,
      action: "UPDATE",
      newData: JSON.stringify({
        entryId,
        internalItemId: product.id,
        supplierItemMappingId,
      }),
    });

    return updatedEntry;
  }

  async createProductFromEntryItem(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    entryItemId: string,
    input: InventoryEntryItemCreateProductInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only create items from imported entries inside your company.");
    }

    const entry = await this.inventoryRepository.findEntryById(companyId, entryId);
    if (!entry) {
      throw new Error("Entrada nao encontrada.");
    }

    if (entry.status !== "DRAFT") {
      throw new Error("Somente entradas em rascunho permitem criar item interno a partir do XML.");
    }

    if (entry.source !== "XML") {
      throw new Error("O cadastro assistido de item esta disponivel somente para entradas importadas por XML.");
    }

    const importedItem = entry.items.find((currentItem) => currentItem.id === entryItemId);
    if (!importedItem) {
      throw new Error("Item importado nao encontrado nesta entrada.");
    }

    const product = await this.createProduct(context, {
      companyId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      sku: input.sku,
      barcode: input.barcode,
      type: input.type,
      unit: input.unit,
      controlsStock: input.controlsStock,
      showOnWebsite: false,
      desiredMargin: input.desiredMargin,
      costPrice:
        input.costPrice !== undefined
          ? roundCurrency(input.costPrice)
          : roundCurrency(toNumber(importedItem.unitCost)),
      salePrice:
        input.salePrice !== undefined
          ? roundCurrency(input.salePrice)
          : roundCurrency(toNumber(importedItem.unitCost)),
      minimumStock: input.minimumStock ?? 0,
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "product",
      recordId: product.id,
      action: "CREATE",
      newData: JSON.stringify({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        type: product.type,
        origin: "ENTRY_XML_IMPORT",
        inventoryEntryId: entryId,
        inventoryEntryItemId: entryItemId,
      }),
    });

    const updatedEntry = await this.matchEntryItem(context, companyId, entryId, entryItemId, {
      internalItemId: product.id,
      saveSupplierMapping: input.saveSupplierMapping ?? true,
      purchaseUnit: input.purchaseUnit || importedItem.purchaseUnit || importedItem.unit,
      stockUnit: input.stockUnit || input.unit || product.unit,
      conversionFactor: input.conversionFactor,
      confidence: input.confidence ?? 100,
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry_item_create_product",
      recordId: entryItemId,
      action: "CREATE",
      newData: JSON.stringify({
        inventoryEntryId: entryId,
        createdProductId: product.id,
        createdProductName: product.name,
      }),
    });

    return {
      entry: updatedEntry,
      product,
    };
  }

  async updateEntry(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    input: InventoryEntryUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update entries inside your company.");
    }

    const existingEntry = await this.inventoryRepository.findEntryById(companyId, entryId);

    if (!existingEntry) {
      throw new Error("Entrada nao encontrada.");
    }

    if (existingEntry.status !== "DRAFT") {
      throw new Error("Entradas confirmadas ou canceladas nao podem ser editadas.");
    }

    const resolvedSupplier = await this.resolveEntrySupplier(companyId, {
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      supplierDocument: input.supplierDocument ?? existingEntry.supplierDocument ?? undefined,
    });

    const duplicatedDocument = await this.inventoryRepository.findDuplicatedEntryDocument(
      companyId,
      {
        supplierName: resolvedSupplier.supplierName ?? undefined,
        entryType: input.entryType,
        documentNumber: input.documentNumber,
        excludeEntryId: entryId,
      },
    );

    if (duplicatedDocument) {
      throw new Error("Ja existe uma entrada com esse fornecedor, tipo e numero de documento.");
    }

    const entryDate = parseRequiredDate(input.entryDate, "data da entrada");
    const firstDueDate = input.firstDueDate
      ? parseRequiredDate(input.firstDueDate, "primeiro vencimento")
      : undefined;

    const updatedEntry = existingEntry.source === "XML"
      ? await (async () => {
          const normalizedImported = await this.normalizeImportedEntryPayload(
            companyId,
            existingEntry,
            input,
          );

          return this.inventoryRepository.updateImportedEntryDraft(companyId, entryId, {
            entryType: input.entryType,
            supplierId: resolvedSupplier.supplierId ?? undefined,
            supplierDocument: resolvedSupplier.supplierDocument ?? undefined,
            supplierName: resolvedSupplier.supplierName ?? undefined,
            documentNumber: input.documentNumber.trim(),
            entryDate,
            notes: input.notes?.trim(),
            financialCondition: input.financialCondition ?? "NONE",
            financialAccountId: input.financialAccountId,
            installmentCount: input.installmentCount ?? 1,
            firstDueDate,
            subtotal: normalizedImported.subtotal,
            totalAmount: normalizedImported.totalAmount,
            items: normalizedImported.items,
          });
        })()
      : await (async () => {
          const normalized = await this.normalizeEntryPayload(companyId, input);

          return this.inventoryRepository.updateEntryDraft(companyId, entryId, {
            entryType: input.entryType,
            supplierId: resolvedSupplier.supplierId ?? undefined,
            supplierDocument: resolvedSupplier.supplierDocument ?? undefined,
            supplierName: resolvedSupplier.supplierName ?? undefined,
            documentNumber: input.documentNumber.trim(),
            entryDate,
            notes: input.notes?.trim(),
            financialCondition: input.financialCondition ?? "NONE",
            financialAccountId: input.financialAccountId,
            installmentCount: input.installmentCount ?? 1,
            firstDueDate,
            subtotal: normalized.subtotal,
            totalAmount: normalized.totalAmount,
            items: normalized.items,
          });
        })();

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry",
      recordId: entryId,
      action: "UPDATE",
      previousData: JSON.stringify({
        documentNumber: existingEntry.documentNumber,
        supplierName: existingEntry.supplierName,
        entryType: existingEntry.entryType,
        totalAmount: toNumber(existingEntry.totalAmount),
      }),
      newData: JSON.stringify({
        documentNumber: updatedEntry.documentNumber,
        supplierName: updatedEntry.supplierName,
        entryType: updatedEntry.entryType,
        totalAmount: toNumber(updatedEntry.totalAmount),
      }),
    });

    return updatedEntry;
  }

  async confirmEntry(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    input: InventoryEntryConfirmInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only confirm entries inside your company.");
    }

    const result = await this.inventoryRepository.confirmEntry({
      companyId,
      entryId,
      confirmedByUserId: tenantContext.userId,
      justification: input.justification?.trim(),
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry",
      recordId: entryId,
      action: "CONFIRM",
      newData: JSON.stringify({
        financialEntries: result.financialEntryIds,
        totalAmount: toNumber(result.entry.totalAmount),
      }),
      justification: input.justification?.trim(),
    });

    return result.entry;
  }

  async cancelEntry(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    input: InventoryEntryCancelInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only cancel entries inside your company.");
    }

    const canceledEntry = await this.inventoryRepository.cancelEntry({
      companyId,
      entryId,
      canceledByUserId: tenantContext.userId,
      justification: input.justification.trim(),
    });

    await this.auditRepository.create({
      companyId,
      userId: tenantContext.userId,
      entityName: "inventory_entry",
      recordId: entryId,
      action: "CANCEL",
      newData: JSON.stringify({
        status: canceledEntry.status,
        canceledAt: canceledEntry.canceledAt,
      }),
      justification: input.justification.trim(),
    });

    return canceledEntry;
  }

  async createMovement(
    context: TenantContext & { permissions: string[] },
    input: InventoryMovementCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.inventoryUpdate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only move stock inside your company.");
    }

    const product = await this.inventoryRepository.findProductById(input.companyId, input.productId);

    if (!product) {
      throw new Error("Product not found.");
    }

    if (!input.reasonText?.trim()) {
      throw new Error("Informe o motivo da movimentacao.");
    }

    const settings = await this.inventoryRepository.getOperationalSettings(input.companyId);
    const movement = await this.inventoryRepository.createMovement({
      ...input,
      quantity: roundQuantity(input.quantity),
      unitCost: input.unitCost !== undefined ? roundCurrency(input.unitCost) : undefined,
      createdByUserId: tenantContext.userId,
      allowNegativeStock: settings.allowNegativeStock,
    });

    await this.auditRepository.create({
      companyId: input.companyId,
      userId: tenantContext.userId,
      entityName: "stock_movement",
      recordId: movement.id,
      action: "CREATE",
      newData: JSON.stringify({
        productId: input.productId,
        movementType: movement.movementType,
        quantity: toNumber(movement.quantity),
        reasonCode: movement.reasonCode,
        reasonText: movement.reasonText,
      }),
      justification: input.reasonText?.trim(),
    });

    return movement;
  }

  async listMovements(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    productId?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view stock movements inside your company.");
    }

    return this.inventoryRepository.listMovements(companyId, productId);
  }

  private async resolveImportedItemMatch(
    companyId: string,
    input: {
      supplierDocument?: string | null;
      supplierName?: string | null;
      supplierProductCode?: string | null;
      supplierProductName: string;
      supplierEan?: string | null;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      lineNumber?: number | null;
      ncm?: string | null;
      cfop?: string | null;
      additionalInfo?: string | null;
    },
  ) {
    const warnings: string[] = [];

    const supplierMappings = await this.inventoryRepository.findSupplierMappingCandidates(companyId, {
      supplierDocument: input.supplierDocument,
      supplierName: input.supplierName,
      supplierProductCode: input.supplierProductCode,
      supplierEan: input.supplierEan,
      supplierProductName: input.supplierProductName,
    });

    const mappedCandidate = supplierMappings[0] ?? null;
    const eanMatch = input.supplierEan
      ? await this.inventoryRepository.findProductByBarcode(companyId, input.supplierEan)
      : null;
    const skuMatch = input.supplierProductCode
      ? await this.inventoryRepository.findProductBySku(companyId, input.supplierProductCode)
      : null;

    const searchCandidates = await this.inventoryRepository.listProducts(
      companyId,
      input.supplierProductName,
      undefined,
      {
        onlyActive: true,
        limit: 12,
      },
    );
    const exactDescriptionMatch =
      searchCandidates.find(
        (candidate) =>
          candidate.name.trim().toLowerCase() === input.supplierProductName.trim().toLowerCase(),
      ) ?? null;
    const approximateMatch = findApproximateProductMatch(searchCandidates, input.supplierProductName);

    const chosenProductId =
      eanMatch?.id ??
      skuMatch?.id ??
      mappedCandidate?.internalItemId ??
      exactDescriptionMatch?.id ??
      approximateMatch?.id ??
      null;

    const chosenProduct = chosenProductId
      ? await this.inventoryRepository.findProductById(companyId, chosenProductId)
      : null;

    const matchStatus = chosenProduct
      ? approximateMatch?.id === chosenProduct.id && !eanMatch && !skuMatch && !mappedCandidate && !exactDescriptionMatch
        ? "SUGGESTED"
        : "MATCHED"
      : "UNMATCHED";
    const matchConfidence = eanMatch
      ? 100
      : skuMatch
        ? 98
        : mappedCandidate?.confidence ?? (exactDescriptionMatch ? 90 : approximateMatch?.score ?? 0);

    if (!chosenProduct) {
      warnings.push(
        "Este item da nota ainda nao esta vinculado a um produto ou servico interno. Escolha um item existente ou cadastre um novo antes de confirmar a entrada.",
      );
    } else if (matchStatus === "SUGGESTED") {
      warnings.push(
        `Sugestao de conciliacao de baixa confianca para ${chosenProduct.name}. Revise antes de confirmar a entrada.`,
      );
    }

    return {
      productId: chosenProduct?.id ?? null,
      productName: chosenProduct?.name ?? null,
      supplierItemMappingId: mappedCandidate?.id ?? null,
      lineNumber: input.lineNumber ?? null,
      supplierProductCode: input.supplierProductCode ?? null,
      supplierProductName: input.supplierProductName,
      supplierEan: input.supplierEan ?? null,
      ncm: input.ncm ?? null,
      cfop: input.cfop ?? null,
      description: input.supplierProductName,
      purchaseUnit: mappedCandidate?.purchaseUnit ?? input.unit,
      unit: mappedCandidate?.stockUnit ?? chosenProduct?.unit ?? input.unit,
      conversionFactor: mappedCandidate?.conversionFactor ?? null,
      quantity: roundQuantity(input.quantity),
      unitCost: roundCurrency(input.unitPrice),
      subtotal: roundCurrency(input.totalPrice || input.quantity * input.unitPrice),
      previousCostPrice: chosenProduct ? toNumber(chosenProduct.costPrice) : null,
      previousSalePrice: chosenProduct ? toNumber(chosenProduct.salePrice) : null,
      suggestedSalePrice: chosenProduct ? toNumber(chosenProduct.salePrice) : null,
      estimatedMarginPercent:
        chosenProduct && toNumber(chosenProduct.salePrice) > 0
          ? roundCurrency(
              ((toNumber(chosenProduct.salePrice) - roundCurrency(input.unitPrice)) /
                toNumber(chosenProduct.salePrice)) *
                100,
            )
          : null,
      priceDecision: chosenProduct ? "KEEP_CURRENT" : null,
      matchStatus,
      matchConfidence,
      warnings,
      additionalInfo: input.additionalInfo,
    };
  }

  private async validateCategory(companyId: string, categoryId?: string) {
    if (!categoryId) {
      return null;
    }

    const category = await this.inventoryRepository.findGroupById(companyId, categoryId);

    if (!category) {
      throw new Error("Grupo de itens nao encontrado.");
    }

    return category;
  }

  private async resolveEntrySupplier(
    companyId: string,
    input: {
      supplierId?: string | null;
      supplierName?: string | null;
      supplierDocument?: string | null;
    },
  ) {
    const normalizedSnapshotName = input.supplierName?.trim() || null;
    const normalizedSnapshotDocument = normalizeSupplierDocument(input.supplierDocument);

    if (input.supplierId) {
      const supplier = await this.inventoryRepository.findSupplierById(companyId, input.supplierId);

      if (!supplier) {
        throw new Error("Fornecedor selecionado nao foi encontrado.");
      }

      return {
        supplierId: supplier.id,
        supplierName: normalizedSnapshotName || buildSupplierDisplayName(supplier),
        supplierDocument: normalizedSnapshotDocument || supplier.document || null,
      };
    }

    const matchedSupplier = await this.inventoryRepository.findSupplierByDocumentOrName(companyId, {
      document: normalizedSnapshotDocument,
      name: normalizedSnapshotName,
    });

    if (matchedSupplier) {
      return {
        supplierId: matchedSupplier.id,
        supplierName: normalizedSnapshotName || buildSupplierDisplayName(matchedSupplier),
        supplierDocument: normalizedSnapshotDocument || matchedSupplier.document || null,
      };
    }

    return {
      supplierId: null,
      supplierName: normalizedSnapshotName,
      supplierDocument: normalizedSnapshotDocument,
    };
  }

  private async normalizeEntryPayload(
    companyId: string,
    input:
      | InventoryEntryCreateInputDto
      | InventoryEntryUpdateInputDto,
  ) {
    const settings = await this.inventoryRepository.getOperationalSettings(companyId);
    const products = await this.inventoryRepository.findProductsByIds(
      companyId,
      [
        ...new Set(
          input.items
            .map((item) => item.productId)
            .filter((value): value is string => Boolean(value)),
        ),
      ],
    );
    const productMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = input.items.map((item) => {
      if (!item.productId) {
        throw new Error("Um dos itens da entrada nao foi encontrado.");
      }

      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Um dos itens da entrada nao foi encontrado.");
      }

      const quantity = roundQuantity(item.quantity);
      const unitCost = roundCurrency(item.unitCost);

      return buildNormalizedProductEntryItem({
        product,
        settingsDefaultMargin: toNumber(settings.defaultMarginPercent),
        description: item.description,
        unit: item.unit,
        quantity,
        unitCost,
        priceDecision: item.priceDecision ?? "KEEP_CURRENT",
        decisionJustification: item.decisionJustification?.trim() || undefined,
        customSalePrice:
          item.customSalePrice !== undefined ? roundCurrency(item.customSalePrice) : undefined,
      });
    });

    const subtotal = roundCurrency(
      normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
    );

    return {
      subtotal,
      totalAmount: subtotal,
      items: normalizedItems,
    };
  }

  private async normalizeImportedEntryPayload(
    companyId: string,
    existingEntry: Awaited<ReturnType<InventoryRepository["findEntryById"]>>,
    input: InventoryEntryUpdateInputDto,
  ) {
    if (!existingEntry) {
      throw new Error("Entrada importada nao encontrada.");
    }

    if (input.items.length !== existingEntry.items.length) {
      throw new Error(
        "Entradas importadas nao permitem adicionar ou remover itens nesta fase. Revise apenas os dados existentes.",
      );
    }

    const existingItemsById = new Map(existingEntry.items.map((item) => [item.id, item]));
    const selectedProductIds = [
      ...new Set(
        input.items
          .map((item) => item.productId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const [settings, products] = await Promise.all([
      this.inventoryRepository.getOperationalSettings(companyId),
      this.inventoryRepository.findProductsByIds(companyId, selectedProductIds),
    ]);
    const productMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = input.items.map((item) => {
      if (!item.id) {
        throw new Error(
          "Cada linha importada precisa preservar sua referencia interna para manter o vinculo com o XML.",
        );
      }

      const existingItem = existingItemsById.get(item.id);
      if (!existingItem) {
        throw new Error("Um dos itens importados nao pertence mais a esta entrada.");
      }

      const quantity = roundQuantity(item.quantity);
      const unitCost = roundCurrency(item.unitCost);
      const nextProductId = item.productId?.trim() || null;
      const product = nextProductId ? productMap.get(nextProductId) : null;

      if (nextProductId && !product) {
        throw new Error("Um dos itens conciliados nao foi encontrado no cadastro interno.");
      }

      if (!product) {
        return {
          productId: null,
          supplierItemMappingId: null,
          lineNumber: existingItem.lineNumber ?? null,
          supplierProductCode: existingItem.supplierProductCode ?? null,
          supplierProductName: existingItem.supplierProductName ?? existingItem.description,
          supplierEan: existingItem.supplierEan ?? null,
          ncm: existingItem.ncm ?? null,
          cfop: existingItem.cfop ?? null,
          purchaseUnit: existingItem.purchaseUnit ?? existingItem.unit,
          conversionFactor:
            existingItem.conversionFactor === null || existingItem.conversionFactor === undefined
              ? null
              : toNumber(existingItem.conversionFactor),
          matchStatus: "UNMATCHED",
          matchConfidence: 0,
          description: item.description.trim(),
          unit: item.unit.trim(),
          quantity,
          unitCost,
          subtotal: roundCurrency(quantity * unitCost),
          previousCostPrice: null,
          previousSalePrice: null,
          suggestedSalePrice: null,
          estimatedMarginPercent: null,
          priceDecision: null,
          decisionJustification: null,
          customSalePrice: null,
        };
      }

      const sameMappedProduct = existingItem.productId === product.id;
      const normalizedItem = buildNormalizedProductEntryItem({
        product,
        settingsDefaultMargin: toNumber(settings.defaultMarginPercent),
        description: item.description,
        unit: item.unit,
        quantity,
        unitCost,
        priceDecision:
          sameMappedProduct && existingItem.priceDecision
            ? normalizeImportedPriceDecision(existingItem.priceDecision)
            : "KEEP_CURRENT",
        decisionJustification:
          sameMappedProduct ? existingItem.decisionJustification ?? undefined : undefined,
        customSalePrice:
          sameMappedProduct && existingItem.customSalePrice !== null
            ? roundCurrency(toNumber(existingItem.customSalePrice))
            : undefined,
      });

      return {
        ...normalizedItem,
        lineNumber: existingItem.lineNumber ?? null,
        supplierProductCode: existingItem.supplierProductCode ?? null,
        supplierProductName: existingItem.supplierProductName ?? existingItem.description,
        supplierEan: existingItem.supplierEan ?? null,
        ncm: existingItem.ncm ?? null,
        cfop: existingItem.cfop ?? null,
        purchaseUnit: existingItem.purchaseUnit ?? existingItem.unit,
        conversionFactor:
          existingItem.conversionFactor === null || existingItem.conversionFactor === undefined
            ? null
            : toNumber(existingItem.conversionFactor),
        supplierItemMappingId: sameMappedProduct ? existingItem.supplierItemMappingId ?? null : null,
        matchStatus: sameMappedProduct
          ? existingItem.matchStatus ?? "MATCHED"
          : "MATCHED",
        matchConfidence: sameMappedProduct
          ? existingItem.matchConfidence === null || existingItem.matchConfidence === undefined
            ? 100
            : toNumber(existingItem.matchConfidence)
          : 100,
      };
    });

    const subtotal = roundCurrency(
      normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
    );

    return {
      subtotal,
      totalAmount: subtotal,
      items: normalizedItems,
    };
  }
}

type ImportedEntryMatchResult = Awaited<ReturnType<InventoryService["resolveImportedItemMatch"]>>;

function buildNormalizedProductEntryItem(input: {
  product: {
    id: string;
    unit: string;
    costPrice: { toNumber(): number } | number;
    salePrice: { toNumber(): number } | number;
    desiredMargin: { toNumber(): number } | number | null;
  };
  settingsDefaultMargin: number;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  priceDecision: "KEEP_CURRENT" | "APPLY_SUGGESTED" | "CUSTOM_PRICE";
  decisionJustification?: string;
  customSalePrice?: number;
}) {
  const subtotal = roundCurrency(input.quantity * input.unitCost);
  const desiredMargin =
    input.product.desiredMargin === null || input.product.desiredMargin === undefined
      ? input.settingsDefaultMargin
      : toNumber(input.product.desiredMargin);
  const suggestedSalePrice =
    desiredMargin >= 100
      ? toNumber(input.product.salePrice)
      : roundCurrency(input.unitCost / (1 - desiredMargin / 100));
  const estimatedMarginPercent =
    toNumber(input.product.salePrice) > 0
      ? roundCurrency(
          ((toNumber(input.product.salePrice) - input.unitCost) / toNumber(input.product.salePrice)) *
            100,
        )
      : 0;

  return {
    productId: input.product.id,
    description: input.description.trim(),
    unit: input.unit.trim(),
    quantity: input.quantity,
    unitCost: input.unitCost,
    subtotal,
    previousCostPrice: toNumber(input.product.costPrice),
    previousSalePrice: toNumber(input.product.salePrice),
    suggestedSalePrice,
    estimatedMarginPercent,
    priceDecision: input.priceDecision,
    decisionJustification: input.decisionJustification,
    customSalePrice: input.customSalePrice,
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function parseRequiredDate(value: string, label: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Informe uma ${label} valida.`);
  }

  return parsedDate;
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function normalizeMargin(value?: number | null) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return Math.round(value * 100) / 100;
}

function normalizeImportedPriceDecision(value?: string | null) {
  if (value === "APPLY_SUGGESTED" || value === "CUSTOM_PRICE") {
    return value;
  }

  return "KEEP_CURRENT";
}

function resolveDesiredMargin(inputMargin?: number, groupMargin?: { toNumber(): number } | number | null) {
  if (inputMargin !== undefined) {
    return normalizeMargin(inputMargin);
  }

  if (groupMargin === null || groupMargin === undefined) {
    return undefined;
  }

  return normalizeMargin(toNumber(groupMargin));
}

function resolveControlsStock(
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE",
  controlsStock?: boolean,
) {
  if (type === "SERVICE") {
    return false;
  }

  return controlsStock ?? true;
}

function mapOperationalSettings(settings: {
  companyId: string;
  defaultMarginPercent: { toNumber(): number } | number;
  minimumMarginPercent: { toNumber(): number } | number;
  costVariationAlertPercent: { toNumber(): number } | number;
  regularDiscountLimitPercent: { toNumber(): number } | number;
  managerDiscountLimitPercent: { toNumber(): number } | number;
  allowNegativeStock: boolean;
}) {
  return {
    companyId: settings.companyId,
    defaultMarginPercent: toNumber(settings.defaultMarginPercent),
    minimumMarginPercent: toNumber(settings.minimumMarginPercent),
    costVariationAlertPercent: toNumber(settings.costVariationAlertPercent),
    regularDiscountLimitPercent: toNumber(settings.regularDiscountLimitPercent),
    managerDiscountLimitPercent: toNumber(settings.managerDiscountLimitPercent),
    allowNegativeStock: settings.allowNegativeStock,
  };
}

function buildCreateHistoryEntries(input: {
  companyId: string;
  userId: string;
  costPrice: number;
  salePrice: number;
}) {
  const entries = [];

  if (input.costPrice > 0) {
    entries.push({
      companyId: input.companyId,
      changedByUserId: input.userId,
      changeType: "COST" as const,
      previousValue: 0,
      newValue: input.costPrice,
      origin: "ITEM_CREATE",
    });
  }

  if (input.salePrice > 0) {
    entries.push({
      companyId: input.companyId,
      changedByUserId: input.userId,
      changeType: "PRICE" as const,
      previousValue: 0,
      newValue: input.salePrice,
      origin: "ITEM_CREATE",
    });
  }

  return entries;
}

function buildUpdateHistoryEntries(input: {
  companyId: string;
  productId: string;
  userId: string;
  previousCostPrice: number;
  previousSalePrice: number;
  costPrice: number;
  salePrice: number;
}) {
  const entries = [];

  if (input.previousCostPrice !== input.costPrice) {
    entries.push({
      companyId: input.companyId,
      productId: input.productId,
      changedByUserId: input.userId,
      changeType: "COST" as const,
      previousValue: input.previousCostPrice,
      newValue: input.costPrice,
      origin: "MANUAL_UPDATE",
    });
  }

  if (input.previousSalePrice !== input.salePrice) {
    entries.push({
      companyId: input.companyId,
      productId: input.productId,
      changedByUserId: input.userId,
      changeType: "PRICE" as const,
      previousValue: input.previousSalePrice,
      newValue: input.salePrice,
      origin: "MANUAL_UPDATE",
    });
  }

  return entries;
}

function buildImportedEntryNotes(document: {
  natureOfOperation: string | null;
  freightAmount: number;
  discountAmount: number;
  protocol: string | null;
}) {
  const parts = [
    document.natureOfOperation ? `Natureza: ${document.natureOfOperation}` : null,
    document.freightAmount > 0 ? `Frete: ${document.freightAmount.toFixed(2)}` : null,
    document.discountAmount > 0 ? `Desconto: ${document.discountAmount.toFixed(2)}` : null,
    document.protocol ? `Protocolo: ${document.protocol}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : undefined;
}

function findApproximateProductMatch(
  products: Array<{ id: string; name: string }>,
  referenceName: string,
) {
  const normalizedReference = normalizeComparableText(referenceName);
  if (!normalizedReference) {
    return null;
  }

  let bestMatch: { id: string; score: number } | null = null;

  for (const product of products) {
    const normalizedCandidate = normalizeComparableText(product.name);
    if (!normalizedCandidate) {
      continue;
    }

    const score = computeTokenOverlapScore(normalizedReference, normalizedCandidate);
    if (score < 60) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: product.id,
        score,
      };
    }
  }

  return bestMatch;
}

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeTokenOverlapScore(reference: string, candidate: string) {
  const referenceTokens = new Set(reference.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));

  if (!referenceTokens.size || !candidateTokens.size) {
    return 0;
  }

  let matches = 0;
  for (const token of referenceTokens) {
    if (candidateTokens.has(token)) {
      matches += 1;
    }
  }

  return Math.round((matches / referenceTokens.size) * 100);
}

function computeAvailableStockFromProduct(product: {
  controlsStock: boolean;
  currentStock: { toNumber(): number } | number;
  stockLayers?: Array<{ availableQuantity: { toNumber(): number } | number }>;
}) {
  const currentStock = toNumber(product.currentStock);

  if (!product.controlsStock) {
    return currentStock;
  }

  return roundQuantity(
    (product.stockLayers ?? []).reduce(
      (sum, layer) => sum + toNumber(layer.availableQuantity),
      0,
    ),
  );
}

function buildPurchaseSuggestionGroupKey(input: {
  preferredSupplierId?: string | null;
  preferredSupplierDocument?: string | null;
  preferredSupplierName?: string | null;
}) {
  return (
    input.preferredSupplierId?.trim() ||
    input.preferredSupplierDocument?.trim() ||
    input.preferredSupplierName?.trim() ||
    "__sem-fornecedor__"
  );
}

function generatePurchaseSuggestionDocumentNumber(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  const hours = String(referenceDate.getHours()).padStart(2, "0");
  const minutes = String(referenceDate.getMinutes()).padStart(2, "0");
  const seconds = String(referenceDate.getSeconds()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `PRE-COMPRA-${year}${month}${day}-${hours}${minutes}${seconds}-${suffix}`;
}

function formatQuantityForNote(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function validateOperationalAttachment(input: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}) {
  const normalizedName = input.fileName.trim();
  if (!normalizedName) {
    throw new Error("Selecione um arquivo valido para anexar a entrada.");
  }

  const maxAttachmentBytes = resolveOperationalAttachmentLimit();
  if (input.fileSize <= 0) {
    throw new Error("O arquivo informado esta vazio. Escolha outro anexo.");
  }

  if (input.fileSize > maxAttachmentBytes) {
    throw new Error(
      `O anexo excede o limite permitido de ${Math.round(maxAttachmentBytes / (1024 * 1024))} MB.`,
    );
  }

  if (!input.mimeType.trim()) {
    throw new Error("Nao foi possivel identificar o tipo do arquivo anexado.");
  }
}

function resolveOperationalAttachmentLimit() {
  const rawValue = process.env.OPERATIONAL_DOCUMENT_MAX_BYTES;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 10 * 1024 * 1024;
}

function buildSupplierDisplayName(supplier: {
  legalName: string;
  tradeName?: string | null;
}) {
  return supplier.tradeName?.trim() || supplier.legalName.trim();
}

function normalizeSupplierDocument(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/[^0-9a-zA-Z]/g, "");
  return normalized || null;
}
