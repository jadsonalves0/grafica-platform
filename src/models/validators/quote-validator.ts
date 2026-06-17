import { z } from "zod";

const quoteItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(2).max(255),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const createQuoteSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  validUntil: z.string().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  items: z.array(quoteItemSchema).min(1),
});

export const updateQuoteSchema = createQuoteSchema.omit({
  companyId: true,
  customerId: true,
});
