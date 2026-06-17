import { z } from "zod";

export const createFinancialAccountSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  type: z.enum(["CASH", "BANK", "DIGITAL_WALLET"]),
  initialBalance: z.coerce.number().optional(),
});

export const updateFinancialAccountSchema = createFinancialAccountSchema.omit({
  companyId: true,
});

export const createFinancialCategorySchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export const updateFinancialCategorySchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["INCOME", "EXPENSE"]),
  isActive: z.boolean(),
});

const financialEntryItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(2).max(255),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const createFinancialEntrySchema = z.object({
  companyId: z.string().uuid(),
  accountId: z.string().uuid(),
  financialCategoryId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  entryType: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(2).max(80),
  description: z.string().min(2).max(255),
  amount: z.coerce.number().positive(),
  dueDate: z.string(),
  items: z.array(financialEntryItemSchema).optional(),
});

export const updateFinancialEntrySchema = createFinancialEntrySchema.omit({
  companyId: true,
});

export const updateFinancialEntryStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELED"]),
  paidAt: z.string().optional(),
});
