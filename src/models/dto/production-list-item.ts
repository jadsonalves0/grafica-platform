export type ProductionListItemDto = {
  id: string;
  productId: string;
  productName: string;
  orderId?: string | null;
  orderCode?: string | null;
  quantityPlanned?: number | null;
  quantityProduced: number;
  lossQuantity: number;
  totalCost: number;
  unitCost: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  producedByName?: string | null;
  responsibleUserName?: string | null;
  completedAt?: string | null;
  consumptions: Array<{
    materialProductId: string;
    materialProductName: string;
    quantityConsumed: number;
    unitCost: number;
    totalCost: number;
  }>;
};
