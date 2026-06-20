export type InventoryProductDetailDto = {
  id: string;
  companyId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: string;
  controlsStock: boolean;
  showOnWebsite: boolean;
  desiredMargin?: number | null;
  currentStock: number;
  availableStock: number;
  hasStockMismatch: boolean;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  priceHistories: InventoryProductPriceHistoryItemDto[];
};

export type InventoryProductPriceHistoryItemDto = {
  id: string;
  changeType: "COST" | "PRICE";
  previousValue: number;
  newValue: number;
  origin: string;
  relatedDocument?: string | null;
  justification?: string | null;
  changedByUserName?: string | null;
  createdAt: string;
};
