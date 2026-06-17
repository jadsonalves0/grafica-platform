export type OrderListItemDto = {
  id: string;
  code: string;
  status: string;
  productionStatus: string;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  totalAmount: number;
  deliveryDate?: string | null;
  createdAt: string;
};
