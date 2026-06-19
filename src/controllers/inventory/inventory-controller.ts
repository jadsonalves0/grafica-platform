import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { CompanyOperationalSettingsDetailDto } from "@/models/dto/company-operational-settings-detail";
import type { CompanyOperationalSettingsUpdateInputDto } from "@/models/dto/company-operational-settings-update-input";
import type { InventoryEntryCancelInputDto } from "@/models/dto/inventory-entry-cancel-input";
import type { InventoryEntryConfirmInputDto } from "@/models/dto/inventory-entry-confirm-input";
import type { InventoryEntryCreateInputDto } from "@/models/dto/inventory-entry-create-input";
import type { InventoryEntryDetailDto } from "@/models/dto/inventory-entry-detail";
import type { InventoryEntryListItemDto } from "@/models/dto/inventory-entry-list-item";
import type { InventoryEntryUpdateInputDto } from "@/models/dto/inventory-entry-update-input";
import type { InventoryGroupCreateInputDto } from "@/models/dto/inventory-group-create-input";
import type { InventoryGroupDetailDto } from "@/models/dto/inventory-group-detail";
import type { InventoryGroupListItemDto } from "@/models/dto/inventory-group-list-item";
import type { InventoryGroupUpdateInputDto } from "@/models/dto/inventory-group-update-input";
import type {
  InventoryProductDetailDto,
  InventoryProductPriceHistoryItemDto,
} from "@/models/dto/inventory-product-detail";
import type { InventoryMovementCreateInputDto } from "@/models/dto/inventory-movement-create-input";
import type { InventoryMovementListItemDto } from "@/models/dto/inventory-movement-list-item";
import type { InventoryProductCreateInputDto } from "@/models/dto/inventory-product-create-input";
import type { InventoryProductListItemDto } from "@/models/dto/inventory-product-list-item";
import type { InventoryProductUpdateInputDto } from "@/models/dto/inventory-product-update-input";
import {
  cancelInventoryEntrySchema,
  confirmInventoryEntrySchema,
  createInventoryEntrySchema,
  createInventoryGroupSchema,
  createInventoryMovementSchema,
  createInventoryProductSchema,
  updateInventoryEntrySchema,
  updateInventoryGroupSchema,
  updateInventoryProductSchema,
} from "@/models/validators/inventory-validator";
import { updateCompanyOperationalSettingsSchema } from "@/models/validators/company-validator";
import { InventoryService } from "@/services/inventory/inventory-service";

type InventoryContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class InventoryController extends BaseController {
  constructor(private readonly inventoryService: InventoryService) {
    super();
  }

  async showOperationalSettings(
    context: InventoryContext,
    companyId: string,
  ): Promise<ControllerResult<CompanyOperationalSettingsDetailDto>> {
    try {
      const settings = await this.inventoryService.getOperationalSettings(context, companyId);
      return this.ok(mapOperationalSettings(settings));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateOperationalSettings(
    context: InventoryContext,
    companyId: string,
    input: CompanyOperationalSettingsUpdateInputDto,
  ): Promise<ControllerResult<CompanyOperationalSettingsDetailDto>> {
    try {
      const payload = updateCompanyOperationalSettingsSchema.parse({
        ...input,
        companyId,
      });
      const settings = await this.inventoryService.updateOperationalSettings(context, companyId, payload);
      return this.ok(mapOperationalSettings(settings));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createGroup(
    context: InventoryContext,
    input: InventoryGroupCreateInputDto,
  ): Promise<ControllerResult<InventoryGroupDetailDto>> {
    try {
      const payload = createInventoryGroupSchema.parse(input);
      const group = await this.inventoryService.createGroup(context, payload);
      return this.ok(mapGroupDetail(group));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async listGroups(
    context: InventoryContext,
    companyId: string,
    search?: string,
  ): Promise<ControllerResult<InventoryGroupListItemDto[]>> {
    try {
      const groups = await this.inventoryService.listGroups(context, companyId, search);
      return this.ok(groups.map(mapGroupListItem));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async showGroup(
    context: InventoryContext,
    companyId: string,
    groupId: string,
  ): Promise<ControllerResult<InventoryGroupDetailDto>> {
    try {
      const group = await this.inventoryService.getGroup(context, companyId, groupId);
      return this.ok(mapGroupDetail(group));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateGroup(
    context: InventoryContext,
    companyId: string,
    groupId: string,
    input: InventoryGroupUpdateInputDto,
  ): Promise<ControllerResult<InventoryGroupDetailDto>> {
    try {
      const payload = updateInventoryGroupSchema.parse(input);
      const group = await this.inventoryService.updateGroup(context, companyId, groupId, payload);
      return this.ok(mapGroupDetail(group));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createProduct(
    context: InventoryContext,
    input: InventoryProductCreateInputDto,
  ): Promise<ControllerResult<InventoryProductListItemDto>> {
    try {
      const payload = createInventoryProductSchema.parse(input);
      const product = await this.inventoryService.createProduct(context, payload);
      return this.ok(mapProduct(product));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createEntry(
    context: InventoryContext,
    input: InventoryEntryCreateInputDto,
  ): Promise<ControllerResult<InventoryEntryDetailDto>> {
    try {
      const payload = createInventoryEntrySchema.parse(input);
      const entry = await this.inventoryService.createEntry(context, payload);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async listEntries(
    context: InventoryContext,
    companyId: string,
    search?: string,
    status?: "DRAFT" | "CONFIRMED" | "CANCELED",
  ): Promise<ControllerResult<InventoryEntryListItemDto[]>> {
    try {
      const entries = await this.inventoryService.listEntries(context, companyId, search, status);
      return this.ok(entries.map(mapEntryListItem));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async showEntry(
    context: InventoryContext,
    companyId: string,
    entryId: string,
  ): Promise<ControllerResult<InventoryEntryDetailDto>> {
    try {
      const entry = await this.inventoryService.getEntry(context, companyId, entryId);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateEntry(
    context: InventoryContext,
    companyId: string,
    entryId: string,
    input: InventoryEntryUpdateInputDto,
  ): Promise<ControllerResult<InventoryEntryDetailDto>> {
    try {
      const payload = updateInventoryEntrySchema.parse(input);
      const entry = await this.inventoryService.updateEntry(context, companyId, entryId, payload);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async confirmEntry(
    context: InventoryContext,
    companyId: string,
    entryId: string,
    input: InventoryEntryConfirmInputDto,
  ): Promise<ControllerResult<InventoryEntryDetailDto>> {
    try {
      const payload = confirmInventoryEntrySchema.parse(input);
      const entry = await this.inventoryService.confirmEntry(context, companyId, entryId, payload);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async cancelEntry(
    context: InventoryContext,
    companyId: string,
    entryId: string,
    input: InventoryEntryCancelInputDto,
  ): Promise<ControllerResult<InventoryEntryDetailDto>> {
    try {
      const payload = cancelInventoryEntrySchema.parse(input);
      const entry = await this.inventoryService.cancelEntry(context, companyId, entryId, payload);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async listProducts(
    context: InventoryContext,
    companyId: string,
    search?: string,
    categoryId?: string,
  ): Promise<ControllerResult<InventoryProductListItemDto[]>> {
    try {
      const products = await this.inventoryService.listProducts(context, companyId, search, categoryId);
      return this.ok(products.map(mapProduct));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async showProduct(
    context: InventoryContext,
    companyId: string,
    productId: string,
  ): Promise<ControllerResult<InventoryProductDetailDto>> {
    try {
      const product = await this.inventoryService.getProduct(context, companyId, productId);
      return this.ok(mapProductDetail(product));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateProduct(
    context: InventoryContext,
    companyId: string,
    productId: string,
    input: InventoryProductUpdateInputDto,
  ): Promise<ControllerResult<InventoryProductDetailDto>> {
    try {
      const payload = updateInventoryProductSchema.parse(input);
      const product = await this.inventoryService.updateProduct(
        context,
        companyId,
        productId,
        payload,
      );
      return this.ok(mapProductDetail(product));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createMovement(
    context: InventoryContext,
    input: InventoryMovementCreateInputDto,
  ): Promise<ControllerResult<InventoryMovementListItemDto>> {
    try {
      const payload = createInventoryMovementSchema.parse(input);
      const movement = await this.inventoryService.createMovement(context, payload);
      return this.ok(mapMovement(movement));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async listMovements(
    context: InventoryContext,
    companyId: string,
    productId?: string,
  ): Promise<ControllerResult<InventoryMovementListItemDto[]>> {
    try {
      const movements = await this.inventoryService.listMovements(context, companyId, productId);
      return this.ok(
        movements.map(mapMovement),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapOperationalSettings(settings: {
  companyId: string;
  defaultMarginPercent: { toNumber(): number } | number;
  minimumMarginPercent: { toNumber(): number } | number;
  costVariationAlertPercent: { toNumber(): number } | number;
  regularDiscountLimitPercent: { toNumber(): number } | number;
  managerDiscountLimitPercent: { toNumber(): number } | number;
  allowNegativeStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CompanyOperationalSettingsDetailDto {
  return {
    companyId: settings.companyId,
    defaultMarginPercent: toNumber(settings.defaultMarginPercent),
    minimumMarginPercent: toNumber(settings.minimumMarginPercent),
    costVariationAlertPercent: toNumber(settings.costVariationAlertPercent),
    regularDiscountLimitPercent: toNumber(settings.regularDiscountLimitPercent),
    managerDiscountLimitPercent: toNumber(settings.managerDiscountLimitPercent),
    allowNegativeStock: settings.allowNegativeStock,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function mapGroupListItem(group: {
  id: string;
  name: string;
  description: string | null;
  defaultMargin: { toNumber(): number } | number | null;
  showOnWebsite: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
}): InventoryGroupListItemDto {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    defaultMargin: group.defaultMargin === null ? null : toNumber(group.defaultMargin),
    showOnWebsite: group.showOnWebsite,
    isActive: group.isActive,
    productsCount: group._count.products,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

function mapGroupDetail(group: {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  defaultMargin: { toNumber(): number } | number | null;
  showOnWebsite: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
}): InventoryGroupDetailDto {
  return {
    id: group.id,
    companyId: group.companyId,
    name: group.name,
    description: group.description,
    defaultMargin: group.defaultMargin === null ? null : toNumber(group.defaultMargin),
    showOnWebsite: group.showOnWebsite,
    isActive: group.isActive,
    productsCount: group._count?.products ?? 0,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

function mapProduct(product: {
  id: string;
  name: string;
  categoryId: string | null;
  category?: { name: string } | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  type: string;
  controlsStock: boolean;
  showOnWebsite: boolean;
  desiredMargin: { toNumber(): number } | number | null;
  currentStock: { toNumber(): number } | number;
  minimumStock: { toNumber(): number } | number;
  costPrice: { toNumber(): number } | number;
  salePrice: { toNumber(): number } | number;
  isActive: boolean;
}): InventoryProductListItemDto {
  return {
    id: product.id,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    type: product.type,
    controlsStock: product.controlsStock,
    showOnWebsite: product.showOnWebsite,
    desiredMargin: product.desiredMargin === null ? null : toNumber(product.desiredMargin),
    currentStock: toNumber(product.currentStock),
    minimumStock: toNumber(product.minimumStock),
    costPrice: toNumber(product.costPrice),
    salePrice: toNumber(product.salePrice),
    isActive: product.isActive,
  };
}

function mapProductDetail(product: {
  id: string;
  companyId: string;
  categoryId: string | null;
  category?: { name: string } | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  type: string;
  controlsStock: boolean;
  showOnWebsite: boolean;
  desiredMargin: { toNumber(): number } | number | null;
  currentStock: { toNumber(): number } | number;
  minimumStock: { toNumber(): number } | number;
  costPrice: { toNumber(): number } | number;
  salePrice: { toNumber(): number } | number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  priceHistories?: Array<{
    id: string;
    changeType: "COST" | "PRICE";
    previousValue: { toNumber(): number } | number;
    newValue: { toNumber(): number } | number;
    origin: string;
    relatedDocument: string | null;
    justification: string | null;
    createdAt: Date;
    changedByUser?: { name: string } | null;
  }>;
}): InventoryProductDetailDto {
  return {
    id: product.id,
    companyId: product.companyId,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    type: product.type,
    controlsStock: product.controlsStock,
    showOnWebsite: product.showOnWebsite,
    desiredMargin: product.desiredMargin === null ? null : toNumber(product.desiredMargin),
    currentStock: toNumber(product.currentStock),
    minimumStock: toNumber(product.minimumStock),
    costPrice: toNumber(product.costPrice),
    salePrice: toNumber(product.salePrice),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    priceHistories: (product.priceHistories ?? []).map(mapPriceHistory),
  };
}

function mapEntryListItem(entry: {
  id: string;
  entryType: string;
  supplierName: string | null;
  documentNumber: string;
  entryDate: Date;
  financialCondition: string;
  status: string;
  subtotal: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  createdAt: Date;
  confirmedAt: Date | null;
  items: Array<unknown>;
}): InventoryEntryListItemDto {
  return {
    id: entry.id,
    entryType: entry.entryType,
    supplierName: entry.supplierName,
    documentNumber: entry.documentNumber,
    entryDate: entry.entryDate.toISOString(),
    financialCondition: entry.financialCondition,
    status: entry.status,
    subtotal: toNumber(entry.subtotal),
    totalAmount: toNumber(entry.totalAmount),
    itemsCount: entry.items.length,
    createdAt: entry.createdAt.toISOString(),
    confirmedAt: entry.confirmedAt?.toISOString() ?? null,
  };
}

function mapEntryDetail(entry: {
  id: string;
  companyId: string;
  entryType: string;
  supplierName: string | null;
  documentNumber: string;
  entryDate: Date;
  notes: string | null;
  financialCondition: string;
  financialAccountId: string | null;
  installmentCount: number;
  firstDueDate: Date | null;
  status: string;
  subtotal: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  confirmedAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    description: string;
    unit: string;
    quantity: { toNumber(): number } | number;
    unitCost: { toNumber(): number } | number;
    subtotal: { toNumber(): number } | number;
    previousCostPrice: { toNumber(): number } | number | null;
    previousSalePrice: { toNumber(): number } | number | null;
    suggestedSalePrice: { toNumber(): number } | number | null;
    estimatedMarginPercent: { toNumber(): number } | number | null;
    priceDecision: string | null;
    decisionJustification: string | null;
    customSalePrice: { toNumber(): number } | number | null;
    product: { name: string };
  }>;
}): InventoryEntryDetailDto {
  return {
    id: entry.id,
    companyId: entry.companyId,
    entryType: entry.entryType,
    supplierName: entry.supplierName,
    documentNumber: entry.documentNumber,
    entryDate: entry.entryDate.toISOString(),
    notes: entry.notes,
    financialCondition: entry.financialCondition,
    financialAccountId: entry.financialAccountId,
    installmentCount: entry.installmentCount,
    firstDueDate: entry.firstDueDate?.toISOString() ?? null,
    status: entry.status,
    subtotal: toNumber(entry.subtotal),
    totalAmount: toNumber(entry.totalAmount),
    confirmedAt: entry.confirmedAt?.toISOString() ?? null,
    canceledAt: entry.canceledAt?.toISOString() ?? null,
    cancelReason: entry.cancelReason,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    items: entry.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      description: item.description,
      unit: item.unit,
      quantity: toNumber(item.quantity),
      unitCost: toNumber(item.unitCost),
      subtotal: toNumber(item.subtotal),
      previousCostPrice: item.previousCostPrice === null ? null : toNumber(item.previousCostPrice),
      previousSalePrice: item.previousSalePrice === null ? null : toNumber(item.previousSalePrice),
      suggestedSalePrice: item.suggestedSalePrice === null ? null : toNumber(item.suggestedSalePrice),
      estimatedMarginPercent:
        item.estimatedMarginPercent === null ? null : toNumber(item.estimatedMarginPercent),
      priceDecision: item.priceDecision,
      decisionJustification: item.decisionJustification,
      customSalePrice: item.customSalePrice === null ? null : toNumber(item.customSalePrice),
    })),
  };
}

function mapPriceHistory(history: {
  id: string;
  changeType: "COST" | "PRICE";
  previousValue: { toNumber(): number } | number;
  newValue: { toNumber(): number } | number;
  origin: string;
  relatedDocument: string | null;
  justification: string | null;
  createdAt: Date;
  changedByUser?: { name: string } | null;
}): InventoryProductPriceHistoryItemDto {
  return {
    id: history.id,
    changeType: history.changeType,
    previousValue: toNumber(history.previousValue),
    newValue: toNumber(history.newValue),
    origin: history.origin,
    relatedDocument: history.relatedDocument,
    justification: history.justification,
    changedByUserName: history.changedByUser?.name ?? null,
    createdAt: history.createdAt.toISOString(),
  };
}

function mapMovement(movement: {
  id: string;
  productId: string;
  product: { name: string };
  movementType: string;
  status: string;
  reasonCode: string | null;
  reasonText: string | null;
  quantity: { toNumber(): number } | number;
  unitCost: { toNumber(): number } | number | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  occurredAt: Date;
  createdAt: Date;
}): InventoryMovementListItemDto {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.product.name,
    movementType: movement.movementType,
    status: movement.status,
    reasonCode: movement.reasonCode,
    reasonText: movement.reasonText,
    quantity: toNumber(movement.quantity),
    unitCost: movement.unitCost ? toNumber(movement.unitCost) : null,
    referenceType: movement.referenceType ?? null,
    referenceId: movement.referenceId ?? null,
    notes: movement.notes ?? null,
    occurredAt: movement.occurredAt.toISOString(),
    createdAt: movement.createdAt.toISOString(),
  };
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
