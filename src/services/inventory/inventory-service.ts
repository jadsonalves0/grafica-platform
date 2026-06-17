import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { InventoryMovementCreateInputDto } from "@/models/dto/inventory-movement-create-input";
import type { InventoryProductCreateInputDto } from "@/models/dto/inventory-product-create-input";
import type { InventoryProductUpdateInputDto } from "@/models/dto/inventory-product-update-input";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class InventoryService extends BaseService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
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

    return this.inventoryRepository.createProduct({
      ...input,
      costPrice: roundCurrency(input.costPrice ?? 0),
      salePrice: roundCurrency(input.salePrice ?? 0),
      minimumStock: roundQuantity(input.minimumStock ?? 0),
    });
  }

  async listProducts(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view inventory inside your company.");
    }

    return this.inventoryRepository.listProducts(companyId, search?.trim() || undefined);
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

    return this.inventoryRepository.updateProduct(companyId, productId, {
      ...input,
      costPrice: roundCurrency(input.costPrice ?? 0),
      salePrice: roundCurrency(input.salePrice ?? 0),
      minimumStock: roundQuantity(input.minimumStock ?? 0),
    });
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

    const currentStock = toNumber(product.currentStock);
    const quantity = roundQuantity(input.quantity);

    const newCurrentStock =
      input.movementType === "INPUT"
        ? currentStock + quantity
        : input.movementType === "OUTPUT"
          ? currentStock - quantity
          : quantity;

    if (input.movementType === "OUTPUT" && newCurrentStock < 0) {
      throw new Error("Stock cannot become negative.");
    }

    return this.inventoryRepository.createMovement({
      ...input,
      quantity,
      unitCost: input.unitCost !== undefined ? roundCurrency(input.unitCost) : undefined,
      createdByUserId: tenantContext.userId,
      newCurrentStock: roundQuantity(newCurrentStock),
    });
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
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
