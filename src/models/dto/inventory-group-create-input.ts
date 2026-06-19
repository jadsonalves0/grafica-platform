export type InventoryGroupCreateInputDto = {
  companyId: string;
  name: string;
  description?: string;
  defaultMargin?: number;
  showOnWebsite?: boolean;
  isActive?: boolean;
};
