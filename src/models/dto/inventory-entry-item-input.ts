export type InventoryEntryItemInputDto = {
  id?: string;
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  priceDecision?: "KEEP_CURRENT" | "APPLY_SUGGESTED" | "CUSTOM_PRICE";
  decisionJustification?: string;
  customSalePrice?: number;
};
