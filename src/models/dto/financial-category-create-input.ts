export type FinancialCategoryCreateInputDto = {
  companyId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};
