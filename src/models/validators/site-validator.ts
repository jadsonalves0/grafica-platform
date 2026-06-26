import { z } from "zod";
import { isValidPhone, normalizePhone } from "@/lib/forms/br-utils";

const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));
const optionalLongText = (max: number) => z.string().max(max).optional().or(z.literal(""));
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

const siteCtaSchema = z.object({
  label: z.string().min(1).max(80),
  action: z.enum(["QUOTE_FORM", "WHATSAPP", "SERVICES", "CONTACT", "CUSTOM"]),
  href: z.string().max(1000).optional().or(z.literal("")),
});

const siteDifferentialSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  icon: z.enum(["speed", "layers", "materials", "support"]),
  isActive: z.boolean(),
});

const siteHowItWorksSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  isActive: z.boolean(),
});

const siteHomeContentSchema = z.object({
  heroEyebrow: optionalText(160),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  heroImageAlt: optionalText(180),
  heroPrimaryCta: siteCtaSchema,
  heroSecondaryCta: siteCtaSchema,
  servicesTitle: optionalText(160),
  differentialsTitle: optionalText(160),
  differentials: z.array(siteDifferentialSchema).max(4),
  howItWorksTitle: optionalText(160),
  howItWorks: z.array(siteHowItWorksSchema).max(3),
  showcaseTitle: optionalText(160),
  showcaseEmptyMessage: optionalLongText(240),
  finalCtaTitle: optionalText(160),
  finalCtaText: optionalLongText(500),
  finalPrimaryCta: siteCtaSchema,
  finalSecondaryCta: siteCtaSchema,
  contactTitle: optionalText(160),
  businessHours: optionalLongText(240),
  mapEmbedUrl: z.string().max(2000).optional().or(z.literal("")),
  whatsappButtonLabel: optionalText(80),
  metaTitle: optionalText(200),
  metaDescription: optionalText(255),
  socialImageUrl: z.string().url().optional().or(z.literal("")),
});

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
  publicationAction: z.enum(["saveDraft", "publish"]).optional(),
  homeContent: siteHomeContentSchema.optional(),
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
