export type OrderDetailDto = {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  code: string;
  status: string;
  productionStatus: string;
  deliveryDate?: string | null;
  totalAmount: number;
  notes?: string | null;
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
};
