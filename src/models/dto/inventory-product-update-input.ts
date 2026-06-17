export type InventoryProductUpdateInputDto = {
  categoryId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
  costPrice?: number;
  salePrice?: number;
  minimumStock?: number;
};
