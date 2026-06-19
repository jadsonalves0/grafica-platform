export type InventoryProductUpdateInputDto = {
  categoryId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  controlsStock?: boolean;
  showOnWebsite?: boolean;
  desiredMargin?: number;
  costPrice?: number;
  salePrice?: number;
  minimumStock?: number;
};
