import { z } from "zod";
import { isValidPhone, normalizeEmailInput, normalizePhone } from "@/lib/forms/br-utils";

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

export const createUserSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(3, "Informe o nome completo.").max(200),
  email: z.string().transform((value) => normalizeEmailInput(value)).pipe(z.string().email()),
  phone: optionalPhone,
  password: z.string().min(8, "A senha inicial deve ter pelo menos 8 caracteres."),
  roleIds: z.array(z.string().uuid()).min(1, "Selecione pelo menos um perfil."),
  isPlatformAdmin: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(200),
  phone: optionalPhone,
  status: z.enum(["ACTIVE", "INVITED", "BLOCKED"]),
  roleIds: z.array(z.string().uuid()).min(1, "Selecione pelo menos um perfil."),
  isPlatformAdmin: z.boolean().optional(),
});
