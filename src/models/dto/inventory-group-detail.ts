export type InventoryGroupDetailDto = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  defaultMargin?: number | null;
  showOnWebsite: boolean;
  isActive: boolean;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
};
