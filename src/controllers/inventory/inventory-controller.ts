import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { InventoryProductDetailDto } from "@/models/dto/inventory-product-detail";
import type { InventoryMovementCreateInputDto } from "@/models/dto/inventory-movement-create-input";
import type { InventoryMovementListItemDto } from "@/models/dto/inventory-movement-list-item";
import type { InventoryProductCreateInputDto } from "@/models/dto/inventory-product-create-input";
import type { InventoryProductListItemDto } from "@/models/dto/inventory-product-list-item";
import type { InventoryProductUpdateInputDto } from "@/models/dto/inventory-product-update-input";
import {
  createInventoryMovementSchema,
  createInventoryProductSchema,
  updateInventoryProductSchema,
} from "@/models/validators/inventory-validator";
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

  async listProducts(
    context: InventoryContext,
    companyId: string,
    search?: string,
  ): Promise<ControllerResult<InventoryProductListItemDto[]>> {
    try {
      const products = await this.inventoryService.listProducts(context, companyId, search);
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
  ): Promise<ControllerResult<{ created: true }>> {
    try {
      const payload = createInventoryMovementSchema.parse(input);
      await this.inventoryService.createMovement(context, payload);
      return this.ok({ created: true });
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
        movements.map((movement) => ({
          id: movement.id,
          productId: movement.productId,
          productName: movement.product.name,
          movementType: movement.movementType,
          quantity: toNumber(movement.quantity),
          unitCost: movement.unitCost ? toNumber(movement.unitCost) : null,
          referenceType: movement.referenceType ?? null,
          createdAt: movement.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapProduct(product: {
  id: string;
  companyId?: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  type: string;
  currentStock: { toNumber(): number } | number;
  minimumStock: { toNumber(): number } | number;
  costPrice: { toNumber(): number } | number;
  salePrice: { toNumber(): number } | number;
  isActive: boolean;
}): InventoryProductListItemDto {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    type: product.type,
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
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  type: string;
  currentStock: { toNumber(): number } | number;
  minimumStock: { toNumber(): number } | number;
  costPrice: { toNumber(): number } | number;
  salePrice: { toNumber(): number } | number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): InventoryProductDetailDto {
  return {
    id: product.id,
    companyId: product.companyId,
    categoryId: product.categoryId,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    type: product.type,
    currentStock: toNumber(product.currentStock),
    minimumStock: toNumber(product.minimumStock),
    costPrice: toNumber(product.costPrice),
    salePrice: toNumber(product.salePrice),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
