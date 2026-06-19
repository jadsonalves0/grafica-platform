import { z } from "zod";

export const productRecipeItemSchema = z.object({
  materialProductId: z.string().uuid(),
  quantityPerUnit: z.coerce.number().positive(),
  lossPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const updateProductRecipeSchema = z.object({
  companyId: z.string().uuid(),
  productId: z.string().uuid(),
  items: z.array(productRecipeItemSchema),
});

export const createProductionSchema = z.object({
  companyId: z.string().uuid(),
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  quantityPlanned: z.coerce.number().positive().optional(),
  quantityProduced: z.coerce.number().positive(),
  lossQuantity: z.coerce.number().nonnegative().optional(),
  responsibleUserId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});
