import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { ProductRecipeUpdateInputDto } from "@/models/dto/product-recipe-update-input";
import type { ProductionCreateInputDto } from "@/models/dto/production-create-input";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { ProductionRepository } from "@/repositories/production/production-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class ProductionService extends BaseService {
  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async getRecipe(context: TenantContext & { permissions: string[] }, companyId: string, productId: string) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view production data inside your company.");
    }

    const product = await this.productionRepository.findRecipeProductById(companyId, productId);

    if (!product) {
      throw new Error("Finished product not found.");
    }

    return product;
  }

  async saveRecipe(context: TenantContext & { permissions: string[] }, input: ProductRecipeUpdateInputDto) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only edit recipes inside your company.");
    }

    const product = await this.productionRepository.findRecipeProductById(input.companyId, input.productId);

    if (!product) {
      throw new Error("Finished product not found.");
    }

    const seenMaterials = new Set<string>();

    for (const item of input.items) {
      if (item.materialProductId === input.productId) {
        throw new Error("The finished product cannot consume itself in the recipe.");
      }

      if (seenMaterials.has(item.materialProductId)) {
        throw new Error("Do not repeat the same raw material in the recipe.");
      }

      seenMaterials.add(item.materialProductId);

      const material = await this.inventoryRepository.findProductById(input.companyId, item.materialProductId);

      if (!material) {
        throw new Error("One of the selected raw materials was not found.");
      }

      if (material.type === "SERVICE") {
        throw new Error("Services cannot be used as raw materials in the recipe.");
      }
    }

    const savedRecipe = await this.productionRepository.replaceRecipe(
      input.companyId,
      input.productId,
      input.items.map((item) => ({
        materialProductId: item.materialProductId,
        quantityPerUnit: roundQuantity(item.quantityPerUnit),
        lossPercent: roundPercent(item.lossPercent ?? 0),
        notes: item.notes?.trim(),
      })),
    );

    if (!savedRecipe) {
      throw new Error("Could not save the recipe.");
    }

    return savedRecipe;
  }

  async listProductions(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    productId?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view production records inside your company.");
    }

    return this.productionRepository.listProductionRecords(companyId, productId);
  }

  async createProduction(context: TenantContext & { permissions: string[] }, input: ProductionCreateInputDto) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only register production inside your company.");
    }

    const product = await this.productionRepository.findRecipeProductById(input.companyId, input.productId);

    if (!product) {
      throw new Error("Finished product not found.");
    }

    if (!product.recipeItems.length) {
      throw new Error("This finished product has no recipe configured yet.");
    }

    const quantityProduced = roundQuantity(input.quantityProduced);
    const consumptions = product.recipeItems.map((item) => {
      const baseQuantity = quantityProduced * toNumber(item.quantityPerUnit);
      const quantityConsumed = roundQuantity(baseQuantity * (1 + toNumber(item.lossPercent) / 100));
      const unitCost = roundCurrency(toNumber(item.materialProduct.costPrice));
      const totalCost = roundCurrency(quantityConsumed * unitCost);

      return {
        materialProductId: item.materialProductId,
        materialName: item.materialProduct.name,
        availableStock: toNumber(item.materialProduct.currentStock),
        quantityConsumed,
        unitCost,
        totalCost,
      };
    });

    for (const consumption of consumptions) {
      if (consumption.availableStock < consumption.quantityConsumed) {
        throw new Error(
          `Estoque insuficiente para ${consumption.materialName}. Necessario ${consumption.quantityConsumed} e disponivel ${consumption.availableStock}.`,
        );
      }
    }

    const totalCost = roundCurrency(consumptions.reduce((sum, item) => sum + item.totalCost, 0));
    const unitCost = roundCurrency(totalCost / quantityProduced);

    const production = await this.productionRepository.createProductionRecord({
      companyId: input.companyId,
      productId: input.productId,
      quantityProduced,
      totalCost,
      unitCost,
      notes: input.notes?.trim(),
      producedByUserId: tenantContext.userId,
      consumptions: consumptions.map((item) => ({
        materialProductId: item.materialProductId,
        quantityConsumed: item.quantityConsumed,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
      })),
    });

    if (!production) {
      throw new Error("Could not register production.");
    }

    return production;
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
