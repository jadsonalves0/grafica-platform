export type InventoryProductDetailDto = {
  id: string;
  companyId: string;
  categoryId?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: string;
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
