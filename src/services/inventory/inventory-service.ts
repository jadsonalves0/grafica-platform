import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { InventoryGroupCreateInputDto } from "@/models/dto/inventory-group-create-input";
import type { InventoryGroupUpdateInputDto } from "@/models/dto/inventory-group-update-input";
import type { CompanyOperationalSettingsUpdateInputDto } from "@/models/dto/company-operational-settings-update-input";
import type { InventoryEntryCancelInputDto } from "@/models/dto/inventory-entry-cancel-input";
import type { InventoryEntryConfirmInputDto } from "@/models/dto/inventory-entry-confirm-input";
import type { InventoryEntryCreateInputDto } from "@/models/dto/inventory-entry-create-input";
import type { InventoryEntryUpdateInputDto } from "@/models/dto/inventory-entry-update-input";
import type { InventoryMovementCreateInputDto } from "@/models/dto/inventory-movement-create-input";
import type { InventoryProductCreateInputDto } from "@/models/dto/inventory-product-create-input";
import type { InventoryProductUpdateInputDto } from "@/models/dto/inventory-product-update-input";
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
    );
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

    const duplicatedDocument = await this.inventoryRepository.findDuplicatedEntryDocument(
      input.companyId,
      {
        supplierName: input.supplierName,
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
      supplierName: input.supplierName?.trim(),
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

    const duplicatedDocument = await this.inventoryRepository.findDuplicatedEntryDocument(
      companyId,
      {
        supplierName: input.supplierName,
        entryType: input.entryType,
        documentNumber: input.documentNumber,
        excludeEntryId: entryId,
      },
    );

    if (duplicatedDocument) {
      throw new Error("Ja existe uma entrada com esse fornecedor, tipo e numero de documento.");
    }

    const normalized = await this.normalizeEntryPayload(companyId, input);
    const updatedEntry = await this.inventoryRepository.updateEntryDraft(companyId, entryId, {
      entryType: input.entryType,
      supplierName: input.supplierName?.trim(),
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

  private async normalizeEntryPayload(
    companyId: string,
    input:
      | InventoryEntryCreateInputDto
      | InventoryEntryUpdateInputDto,
  ) {
    const settings = await this.inventoryRepository.getOperationalSettings(companyId);
    const products = await this.inventoryRepository.findProductsByIds(
      companyId,
      [...new Set(input.items.map((item) => item.productId))],
    );
    const productMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = input.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Um dos itens da entrada nao foi encontrado.");
      }

      const quantity = roundQuantity(item.quantity);
      const unitCost = roundCurrency(item.unitCost);
      const subtotal = roundCurrency(quantity * unitCost);
      const desiredMargin =
        product.desiredMargin === null || product.desiredMargin === undefined
          ? toNumber(settings.defaultMarginPercent)
          : toNumber(product.desiredMargin);
      const suggestedSalePrice =
        desiredMargin >= 100
          ? toNumber(product.salePrice)
          : roundCurrency(unitCost / (1 - desiredMargin / 100));
      const estimatedMarginPercent =
        toNumber(product.salePrice) > 0
          ? roundCurrency(((toNumber(product.salePrice) - unitCost) / toNumber(product.salePrice)) * 100)
          : 0;

      return {
        productId: item.productId,
        description: item.description.trim(),
        unit: item.unit.trim(),
        quantity,
        unitCost,
        subtotal,
        previousCostPrice: toNumber(product.costPrice),
        previousSalePrice: toNumber(product.salePrice),
        suggestedSalePrice,
        estimatedMarginPercent,
        priceDecision: item.priceDecision ?? "KEEP_CURRENT",
        decisionJustification: item.decisionJustification?.trim() || undefined,
        customSalePrice:
          item.customSalePrice !== undefined ? roundCurrency(item.customSalePrice) : undefined,
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
