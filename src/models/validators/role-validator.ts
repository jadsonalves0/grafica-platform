import { z } from "zod";
import { normalizeRoleCodeInput } from "@/lib/forms/br-utils";

export const createRoleSchema = z.object({
  companyId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(3).max(120),
  code: z
    .string()
    .transform((value) => normalizeRoleCodeInput(value))
    .pipe(z.string().min(3, "Informe um codigo valido para o perfil.").max(60)),
  permissionCodes: z.array(z.string().min(3)).min(1),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(3).max(120),
  permissionCodes: z.array(z.string().min(3)).min(1),
});
