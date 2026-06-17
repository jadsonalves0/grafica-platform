export type QuoteDetailDto = {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  code: string;
  status: string;
  issueDate: string;
  validUntil?: string | null;
  subtotal: number;
  discountAmount: number;
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
