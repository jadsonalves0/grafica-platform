import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { ProductRecipeDetailDto } from "@/models/dto/product-recipe-detail";
import type { ProductRecipeUpdateInputDto } from "@/models/dto/product-recipe-update-input";
import type { ProductionCreateInputDto } from "@/models/dto/production-create-input";
import type { ProductionListItemDto } from "@/models/dto/production-list-item";
import { createProductionSchema, updateProductRecipeSchema } from "@/models/validators/production-validator";
import { ProductionService } from "@/services/production/production-service";

type ProductionContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class ProductionController extends BaseController {
  constructor(private readonly productionService: ProductionService) {
    super();
  }

  async showRecipe(
    context: ProductionContext,
    companyId: string,
    productId: string,
  ): Promise<ControllerResult<ProductRecipeDetailDto>> {
    try {
      const product = await this.productionService.getRecipe(context, companyId, productId);
      return this.ok(mapRecipe(product));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async updateRecipe(
    context: ProductionContext,
    input: ProductRecipeUpdateInputDto,
  ): Promise<ControllerResult<ProductRecipeDetailDto>> {
    try {
      const payload = updateProductRecipeSchema.parse(input);
      const product = await this.productionService.saveRecipe(context, payload);
      return this.ok(mapRecipe(product));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async listProductions(
    context: ProductionContext,
    companyId: string,
    productId?: string,
  ): Promise<ControllerResult<ProductionListItemDto[]>> {
    try {
      const records = await this.productionService.listProductions(context, companyId, productId);
      return this.ok(records.map(mapProduction));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async createProduction(
    context: ProductionContext,
    input: ProductionCreateInputDto,
  ): Promise<ControllerResult<ProductionListItemDto>> {
    try {
      const payload = createProductionSchema.parse(input);
      const production = await this.productionService.createProduction(context, payload);
      return this.ok(mapProduction(production));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }
}

function mapRecipe(product: {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  type: string;
  costPrice: { toNumber(): number } | number;
  currentStock: { toNumber(): number } | number;
  recipeItems: Array<{
    id: string;
    materialProductId: string;
    quantityPerUnit: { toNumber(): number } | number;
    lossPercent: { toNumber(): number } | number;
    notes: string | null;
    materialProduct: {
      name: string;
      unit: string;
      sku: string | null;
      currentStock: { toNumber(): number } | number;
      costPrice: { toNumber(): number } | number;
    };
  }>;
}): ProductRecipeDetailDto {
  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      type: product.type,
      costPrice: toNumber(product.costPrice),
      currentStock: toNumber(product.currentStock),
    },
    items: product.recipeItems.map((item) => ({
      id: item.id,
      materialProductId: item.materialProductId,
      materialProductName: item.materialProduct.name,
      materialUnit: item.materialProduct.unit,
      materialSku: item.materialProduct.sku,
      materialCurrentStock: toNumber(item.materialProduct.currentStock),
      materialCostPrice: toNumber(item.materialProduct.costPrice),
      quantityPerUnit: toNumber(item.quantityPerUnit),
      lossPercent: toNumber(item.lossPercent),
      notes: item.notes,
    })),
  };
}

function mapProduction(record: {
  id: string;
  productId: string;
  quantityProduced: { toNumber(): number } | number;
  totalCost: { toNumber(): number } | number;
  unitCost: { toNumber(): number } | number;
  notes: string | null;
  createdAt: Date;
  product: { name: string };
  producedByUser: { name: string } | null;
  consumptions: Array<{
    materialProductId: string;
    quantityConsumed: { toNumber(): number } | number;
    unitCost: { toNumber(): number } | number;
    totalCost: { toNumber(): number } | number;
    materialProduct: { name: string };
  }>;
}): ProductionListItemDto {
  return {
    id: record.id,
    productId: record.productId,
    productName: record.product.name,
    quantityProduced: toNumber(record.quantityProduced),
    totalCost: toNumber(record.totalCost),
    unitCost: toNumber(record.unitCost),
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    producedByName: record.producedByUser?.name ?? null,
    consumptions: record.consumptions.map((item) => ({
      materialProductId: item.materialProductId,
      materialProductName: item.materialProduct.name,
      quantityConsumed: toNumber(item.quantityConsumed),
      unitCost: toNumber(item.unitCost),
      totalCost: toNumber(item.totalCost),
    })),
  };
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
