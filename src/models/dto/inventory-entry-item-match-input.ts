export type InventoryEntryItemMatchInputDto = {
  internalItemId: string;
  saveSupplierMapping?: boolean;
  purchaseUnit?: string;
  stockUnit?: string;
  conversionFactor?: number;
  confidence?: number;
};
