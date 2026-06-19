export type ProductionCreateInputDto = {
  companyId: string;
  productId: string;
  orderId?: string;
  quantityPlanned?: number;
  quantityProduced: number;
  lossQuantity?: number;
  responsibleUserId?: string;
  notes?: string;
};
