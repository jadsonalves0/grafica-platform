import { z } from "zod";
import {
  isValidCpfCnpj,
  isValidPhone,
  isValidStateCode,
  isValidZipCode,
  normalizeDocument,
  normalizeEmailInput,
  normalizePhone,
  normalizeStateCode,
  normalizeZipCode,
} from "@/lib/forms/br-utils";

const optionalTrimmedText = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max).optional(),
  );

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizeEmailInput(value);
    return normalized === "" ? undefined : normalized;
  },
  z.string().email("Informe um e-mail valido.").optional(),
);

const optionalDocument = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizeDocument(value);
    return normalized === "" ? undefined : normalized;
  },
  z
    .string()
    .refine((value) => isValidCpfCnpj(value), "Informe um CPF ou CNPJ valido.")
    .optional(),
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

const optionalZipCode = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizeZipCode(value);
    return normalized === "" ? undefined : normalized;
  },
  z
    .string()
    .refine((value) => isValidZipCode(value), "Informe um CEP valido.")
    .optional(),
);

const optionalStateCode = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizeStateCode(value);
    return normalized === "" ? undefined : normalized;
  },
  z
    .string()
    .refine((value) => isValidStateCode(value), "Informe uma UF valida.")
    .optional(),
);

export const createCustomerSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(3, "Informe o nome ou razao social.").max(200),
  isActive: z.boolean().optional(),
  document: optionalDocument,
  email: optionalEmail,
  phone: optionalPhone,
  whatsapp: optionalPhone,
  addressZipCode: optionalZipCode,
  addressStreet: optionalTrimmedText(200),
  addressNumber: optionalTrimmedText(20),
  addressDistrict: optionalTrimmedText(120),
  addressCity: optionalTrimmedText(120),
  addressState: optionalStateCode,
  notes: optionalTrimmedText(2000),
});

export const updateCustomerSchema = createCustomerSchema.omit({
  companyId: true,
});

export const updateCustomerStatusSchema = z.object({
  isActive: z.boolean(),
});
