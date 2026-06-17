export type ProductRecipeItemInputDto = {
  materialProductId: string;
  quantityPerUnit: number;
  lossPercent?: number;
  notes?: string;
};
