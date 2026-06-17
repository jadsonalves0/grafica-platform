import { z } from "zod";

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companySlug: z.string().min(2).max(120),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
