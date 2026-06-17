export type ProductionListItemDto = {
  id: string;
  productId: string;
  productName: string;
  quantityProduced: number;
  totalCost: number;
  unitCost: number;
  notes?: string | null;
  createdAt: string;
  producedByName?: string | null;
  consumptions: Array<{
    materialProductId: string;
    materialProductName: string;
    quantityConsumed: number;
    unitCost: number;
    totalCost: number;
  }>;
};
