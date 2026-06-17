import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(2).max(255),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const createOrderSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  items: z.array(orderItemSchema).optional(),
});

export const updateOrderSchema = z.object({
  deliveryDate: z.string().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"]).optional(),
  productionStatus: z
    .enum(["PENDING", "IN_PRODUCTION", "WAITING_APPROVAL", "READY", "DELIVERED"])
    .optional(),
});
