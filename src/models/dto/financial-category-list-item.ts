export type FinancialCategoryListItemDto = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
