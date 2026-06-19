export type InventoryGroupListItemDto = {
  id: string;
  name: string;
  description?: string | null;
  defaultMargin?: number | null;
  showOnWebsite: boolean;
  isActive: boolean;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
};
