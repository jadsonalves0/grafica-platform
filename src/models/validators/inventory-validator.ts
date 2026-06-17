import { z } from "zod";
import {
  isValidGtin,
  normalizeReferenceInput,
  normalizeGtinInput,
  normalizeSkuInput,
  normalizeUnitInput,
} from "@/lib/forms/br-utils";

export const createInventoryProductSchema = z.object({
  companyId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(200),
  sku: z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const normalized = normalizeSkuInput(value);
        return normalized === "" ? undefined : normalized;
      },
      z.string().max(40).optional(),
    ),
  barcode: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = normalizeGtinInput(value);
      return normalized === "" ? undefined : normalized;
    },
    z
      .string()
      .refine((value) => isValidGtin(value), "Informe um EAN/GTIN valido.")
      .optional(),
  ),
  unit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().min(1, "Informe a unidade.").max(12)),
  type: z.enum(["RAW_MATERIAL", "SERVICE", "FINISHED_PRODUCT"]),
  costPrice: z.coerce.number().nonnegative().optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  minimumStock: z.coerce.number().nonnegative().optional(),
});

export const updateInventoryProductSchema = createInventoryProductSchema.omit({
  companyId: true,
});

export const createInventoryMovementSchema = z.object({
  companyId: z.string().uuid(),
  productId: z.string().uuid(),
  movementType: z.enum(["INPUT", "OUTPUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().optional(),
  referenceType: z.enum(["MANUAL", "QUOTE", "ORDER", "PURCHASE"]).optional(),
  referenceId: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = normalizeReferenceInput(value);
      return normalized === "" ? undefined : normalized;
    },
    z.string().max(80).optional(),
  ),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
