export type FinancialEntryDetailDto = {
  id: string;
  accountId: string;
  accountName: string;
  financialCategoryId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  quoteId?: string | null;
  entryType: string;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};
