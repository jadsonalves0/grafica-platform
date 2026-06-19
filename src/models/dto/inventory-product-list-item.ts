export type InventoryProductListItemDto = {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: string;
  controlsStock: boolean;
  showOnWebsite: boolean;
  desiredMargin?: number | null;
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};
