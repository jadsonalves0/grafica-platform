import { z } from "zod";
import { isValidPhone, normalizePhone } from "@/lib/forms/br-utils";

const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));
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

export const updateSiteSettingsSchema = z.object({
  companyId: z.string().uuid(),
  primaryColor: optionalText(20),
  secondaryColor: optionalText(20),
  accentColor: optionalText(20),
  logoUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),
  heroTitle: optionalText(255),
  heroSubtitle: z.string().max(2000).optional().or(z.literal("")),
  aboutText: z.string().max(4000).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: optionalPhone,
  contactWhatsapp: optionalPhone,
  instagramUrl: z.string().url().optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  addressFull: z.string().max(500).optional().or(z.literal("")),
  isSitePublished: z.boolean().optional(),
});

export const createSiteServiceSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(2).max(160),
  shortDescription: z.string().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const updateSiteServiceSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(2).max(160),
  shortDescription: z.string().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const createSiteBannerSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().max(160).optional().or(z.literal("")),
  subtitle: z.string().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(80).optional().or(z.literal("")),
  ctaLink: z.string().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const updateSiteBannerSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().max(160).optional().or(z.literal("")),
  subtitle: z.string().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(80).optional().or(z.literal("")),
  ctaLink: z.string().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
