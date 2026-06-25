export type OrderListItemDto = {
  id: string;
  code: string;
  status: string;
  productionStatus: string;
  hasLinkedSale?: boolean;
  linkedSaleEntryId?: string | null;
  readyForSale?: boolean;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  totalAmount: number;
  deliveryDate?: string | null;
  createdAt: string;
};
