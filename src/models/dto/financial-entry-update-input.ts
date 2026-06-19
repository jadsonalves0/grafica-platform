export type FinancialEntryUpdateInputDto = {
  accountId: string;
  financialCategoryId?: string;
  entryType: "INCOME" | "EXPENSE";
  category: string;
  description?: string;
  amount: number;
  dueDate: string;
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string;
  customerId?: string;
  orderId?: string;
  quoteId?: string;
  items?: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};
