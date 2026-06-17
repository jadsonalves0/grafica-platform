export type FinancialCategoryUpdateInputDto = {
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
};
