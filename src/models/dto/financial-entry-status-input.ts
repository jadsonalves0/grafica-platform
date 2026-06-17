export type FinancialEntryStatusInputDto = {
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string;
};
