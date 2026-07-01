export type InventoryEntryItemCreateProductInputDto = {
  categoryId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  unit: string;
  controlsStock?: boolean;
  desiredMargin?: number;
  costPrice?: number;
  salePrice?: number;
  minimumStock?: number;
  saveSupplierMapping?: boolean;
  purchaseUnit?: string;
  stockUnit?: string;
  conversionFactor?: number;
  confidence?: number;
};
