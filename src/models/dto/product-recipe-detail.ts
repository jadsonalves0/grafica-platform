export type ProductRecipeDetailDto = {
  product: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    type: string;
    costPrice: number;
    currentStock: number;
  };
  items: Array<{
    id: string;
    materialProductId: string;
    materialProductName: string;
    materialUnit: string;
    materialSku?: string | null;
    materialCurrentStock: number;
    materialCostPrice: number;
    quantityPerUnit: number;
    lossPercent: number;
    notes?: string | null;
  }>;
};
