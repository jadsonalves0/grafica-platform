export type FinancialEntryCreateInputDto = {
  companyId: string;
  accountId: string;
  financialCategoryId?: string;
  customerId?: string;
  orderId?: string;
  quoteId?: string;
  entryType: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  items?: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};
