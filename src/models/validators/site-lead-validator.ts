import { z } from "zod";
import { isValidPhone, normalizeEmailInput, normalizePhone } from "@/lib/forms/br-utils";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max).optional(),
  );

const optionalPhone = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizePhone(value);
    return normalized === "" ? undefined : normalized;
  },
  z
    .string()
    .refine((value) => isValidPhone(value), "Informe um telefone valido com DDD.")
    .optional(),
);

export const createSiteLeadSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  email: z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const normalized = normalizeEmailInput(value);
        return normalized === "" ? undefined : normalized;
      },
      z.string().email("Informe um e-mail valido.").optional(),
    ),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  subject: optionalText(160),
  message: optionalText(3000),
  requestedService: optionalText(160),
});

export const updateSiteLeadStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "ARCHIVED"]),
});

export const convertSiteLeadSchema = z.object({
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const leadToQuoteSchema = z.object({
  validUntil: z.string().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        description: z.string().min(2).max(255),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().nonnegative(),
      }),
    )
    .min(1),
});
