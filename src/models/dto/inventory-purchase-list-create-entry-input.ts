export type InventoryPurchaseListCreateEntryInputDto = {
  companyId: string;
  productIds: string[];
  supplierId?: string;
  supplierName?: string;
  supplierDocument?: string;
};
