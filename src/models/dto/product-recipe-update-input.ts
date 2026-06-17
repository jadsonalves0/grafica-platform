import type { ProductRecipeItemInputDto } from "@/models/dto/product-recipe-item-input";

export type ProductRecipeUpdateInputDto = {
  companyId: string;
  productId: string;
  items: ProductRecipeItemInputDto[];
};
