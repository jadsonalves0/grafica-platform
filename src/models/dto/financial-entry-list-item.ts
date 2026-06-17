export type FinancialEntryListItemDto = {
  id: string;
  accountId: string;
  accountName: string;
  financialCategoryId?: string | null;
  entryType: string;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  itemCount?: number;
};
