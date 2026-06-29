export type OrderBillingInputDto = {
  accountId?: string;
  financialCategoryId?: string;
  dueDate?: string;
  paymentStatus?: "PENDING" | "PAID";
  description?: string;
};
