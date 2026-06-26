export const SITE_HOME_PAGE_KEY = "HOME";
export const SITE_HOME_PAGE_SLUG = "home";
export const SITE_HOME_DRAFT_PAGE_KEY = "HOME_DRAFT";
export const SITE_HOME_DRAFT_PAGE_SLUG = "home-draft";

export type SiteCtaAction =
  | "QUOTE_FORM"
  | "WHATSAPP"
  | "SERVICES"
  | "CONTACT"
  | "CUSTOM";

export type SiteCtaConfig = {
  label: string;
  action: SiteCtaAction;
  href?: string;
};

export type SiteDifferentialItem = {
  title: string;
  description: string;
  icon: "speed" | "layers" | "materials" | "support";
  isActive: boolean;
};

export type SiteHowItWorksItem = {
  title: string;
  description: string;
  isActive: boolean;
};

export type SiteHomeContent = {
  heroEyebrow: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroPrimaryCta: SiteCtaConfig;
  heroSecondaryCta: SiteCtaConfig;
  servicesTitle: string;
  differentialsTitle: string;
  differentials: SiteDifferentialItem[];
  howItWorksTitle: string;
  howItWorks: SiteHowItWorksItem[];
  showcaseTitle: string;
  showcaseEmptyMessage: string;
  finalCtaTitle: string;
  finalCtaText: string;
  finalPrimaryCta: SiteCtaConfig;
  finalSecondaryCta: SiteCtaConfig;
  contactTitle: string;
  businessHours: string;
  mapEmbedUrl: string;
  whatsappButtonLabel: string;
  metaTitle: string;
  metaDescription: string;
  socialImageUrl: string;
};

export type SitePublicData = {
  company: {
    id: string;
    tradeName: string;
    slug: string;
  };
  settings: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    aboutText?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    addressFull?: string | null;
    isSitePublished: boolean;
  } | null;
  services: Array<{
    id: string;
    title: string;
    shortDescription?: string | null;
    imageUrl?: string | null;
  }>;
  banners: Array<{
    id: string;
    title?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaLink?: string | null;
  }>;
  home: SiteHomeContent;
};

type DraftComposeInput = {
  company: {
    id: string;
    tradeName: string;
    slug: string;
  };
  settings: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    aboutText?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    addressFull?: string | null;
    isSitePublished: boolean;
  } | null;
  services: Array<{
    id: string;
    title: string;
    shortDescription?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }>;
  banners: Array<{
    id: string;
    title?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaLink?: string | null;
    isActive?: boolean;
  }>;
  homeContent?: Partial<SiteHomeContent> | null;
  isPublished: boolean;
};

export function createDefaultSiteHomeContent() {
  return {
    heroEyebrow: "Impressao criativa com atendimento proximo",
    heroImageUrl: "",
    heroImageAlt: "Mockup de materiais graficos em destaque",
    heroPrimaryCta: {
      label: "Pedir orcamento",
      action: "QUOTE_FORM" as const,
      href: "",
    },
    heroSecondaryCta: {
      label: "Conhecer servicos",
      action: "SERVICES" as const,
      href: "",
    },
    servicesTitle: "Servicos em destaque",
    differentialsTitle: "Por que escolher nossa grafica",
    differentials: [
      {
        title: "Atendimento rapido",
        description: "Conversamos sobre a sua demanda com agilidade e orientacao clara.",
        icon: "speed",
        isActive: true,
      },
      {
        title: "Producao sob medida",
        description: "Escolha formatos, papeis e acabamentos conforme o seu projeto.",
        icon: "layers",
        isActive: true,
      },
      {
        title: "Variedade de materiais",
        description: "Cartoes, adesivos, banners e impressos para diferentes usos comerciais.",
        icon: "materials",
        isActive: true,
      },
      {
        title: "Acompanhamento pelo WhatsApp",
        description: "Voce acompanha o orcamento e tira duvidas pelo canal mais pratico.",
        icon: "support",
        isActive: true,
      },
    ],
    howItWorksTitle: "Como funciona",
    howItWorks: [
      {
        title: "Envie sua ideia",
        description: "Conte o que voce precisa e compartilhe referencias, medidas ou quantidades.",
        isActive: true,
      },
      {
        title: "Receba a proposta",
        description: "Montamos a melhor proposta com orientacao de material, prazo e acabamento.",
        isActive: true,
      },
      {
        title: "Aprove e acompanhe",
        description: "Depois da aprovacao, seguimos para producao e alinhamos a entrega com voce.",
        isActive: true,
      },
    ],
    showcaseTitle: "Ideias que viraram impressao",
    showcaseEmptyMessage: "Adicione imagens reais dos servicos para valorizar o site publicado.",
    finalCtaTitle: "Tem um projeto em mente?",
    finalCtaText: "Fale com a nossa equipe e receba uma proposta personalizada para o seu material grafico.",
    finalPrimaryCta: {
      label: "Pedir orcamento",
      action: "QUOTE_FORM" as const,
      href: "",
    },
    finalSecondaryCta: {
      label: "Falar pelo WhatsApp",
      action: "WHATSAPP" as const,
      href: "",
    },
    contactTitle: "Fale com a gente",
    businessHours: "",
    mapEmbedUrl: "",
    whatsappButtonLabel: "Falar pelo WhatsApp",
    metaTitle: "",
    metaDescription: "",
    socialImageUrl: "",
  } satisfies SiteHomeContent;
}

export function normalizeSiteHomeContent(input?: Partial<SiteHomeContent> | null): SiteHomeContent {
  const defaults = createDefaultSiteHomeContent();
  const source = input ?? {};

  return {
    heroEyebrow: normalizeText(source.heroEyebrow, defaults.heroEyebrow),
    heroImageUrl: normalizeText(source.heroImageUrl, defaults.heroImageUrl),
    heroImageAlt: normalizeText(source.heroImageAlt, defaults.heroImageAlt),
    heroPrimaryCta: normalizeCta(source.heroPrimaryCta, defaults.heroPrimaryCta),
    heroSecondaryCta: normalizeCta(source.heroSecondaryCta, defaults.heroSecondaryCta),
    servicesTitle: normalizeText(source.servicesTitle, defaults.servicesTitle),
    differentialsTitle: normalizeText(source.differentialsTitle, defaults.differentialsTitle),
    differentials: normalizeDifferentials(source.differentials, defaults.differentials),
    howItWorksTitle: normalizeText(source.howItWorksTitle, defaults.howItWorksTitle),
    howItWorks: normalizeHowItWorks(source.howItWorks, defaults.howItWorks),
    showcaseTitle: normalizeText(source.showcaseTitle, defaults.showcaseTitle),
    showcaseEmptyMessage: normalizeText(source.showcaseEmptyMessage, defaults.showcaseEmptyMessage),
    finalCtaTitle: normalizeText(source.finalCtaTitle, defaults.finalCtaTitle),
    finalCtaText: normalizeText(source.finalCtaText, defaults.finalCtaText),
    finalPrimaryCta: normalizeCta(source.finalPrimaryCta, defaults.finalPrimaryCta),
    finalSecondaryCta: normalizeCta(source.finalSecondaryCta, defaults.finalSecondaryCta),
    contactTitle: normalizeText(source.contactTitle, defaults.contactTitle),
    businessHours: normalizeText(source.businessHours, defaults.businessHours),
    mapEmbedUrl: normalizeText(source.mapEmbedUrl, defaults.mapEmbedUrl),
    whatsappButtonLabel: normalizeText(source.whatsappButtonLabel, defaults.whatsappButtonLabel),
    metaTitle: normalizeText(source.metaTitle, defaults.metaTitle),
    metaDescription: normalizeText(source.metaDescription, defaults.metaDescription),
    socialImageUrl: normalizeText(source.socialImageUrl, defaults.socialImageUrl),
  };
}

export function parseSiteHomeContent(value?: string | null) {
  if (!value) {
    return createDefaultSiteHomeContent();
  }

  try {
    const parsed = JSON.parse(value) as Partial<SiteHomeContent>;
    return normalizeSiteHomeContent(parsed);
  } catch {
    return createDefaultSiteHomeContent();
  }
}

export function stringifySiteHomeContent(value: SiteHomeContent) {
  return JSON.stringify(normalizeSiteHomeContent(value));
}

export function composeDraftSitePublicData(input: DraftComposeInput): SitePublicData {
  const home = normalizeSiteHomeContent(input.homeContent);
  const settings = input.settings
    ? {
        primaryColor: input.settings.primaryColor ?? null,
        secondaryColor: input.settings.secondaryColor ?? null,
        accentColor: input.settings.accentColor ?? null,
        logoUrl: input.settings.logoUrl ?? null,
        faviconUrl: input.settings.faviconUrl ?? null,
        heroTitle: input.settings.heroTitle ?? null,
        heroSubtitle: input.settings.heroSubtitle ?? null,
        aboutText: input.settings.aboutText ?? null,
        contactEmail: input.settings.contactEmail ?? null,
        contactPhone: input.settings.contactPhone ?? null,
        contactWhatsapp: input.settings.contactWhatsapp ?? null,
        instagramUrl: input.settings.instagramUrl ?? null,
        facebookUrl: input.settings.facebookUrl ?? null,
        addressFull: input.settings.addressFull ?? null,
        isSitePublished: input.isPublished,
      }
    : null;

  return {
    company: input.company,
    settings,
    services: input.services
      .filter((service) => service.isActive ?? true)
      .map((service) => ({
        id: service.id,
        title: service.title,
        shortDescription: service.shortDescription ?? null,
        imageUrl: service.imageUrl ?? null,
      })),
    banners: input.banners
      .filter((banner) => banner.isActive ?? true)
      .map((banner) => ({
        id: banner.id,
        title: banner.title ?? null,
        subtitle: banner.subtitle ?? null,
        imageUrl: banner.imageUrl ?? null,
        ctaLabel: banner.ctaLabel ?? null,
        ctaLink: banner.ctaLink ?? null,
      })),
    home,
  };
}

export function parsePublishedSiteSnapshot(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SitePublicData>;

    if (!parsed.company || !parsed.home) {
      return null;
    }

    return {
      company: {
        id: parsed.company.id ?? "",
        tradeName: parsed.company.tradeName ?? "",
        slug: parsed.company.slug ?? "",
      },
      settings: parsed.settings
        ? {
            primaryColor: parsed.settings.primaryColor ?? null,
            secondaryColor: parsed.settings.secondaryColor ?? null,
            accentColor: parsed.settings.accentColor ?? null,
            logoUrl: parsed.settings.logoUrl ?? null,
            faviconUrl: parsed.settings.faviconUrl ?? null,
            heroTitle: parsed.settings.heroTitle ?? null,
            heroSubtitle: parsed.settings.heroSubtitle ?? null,
            aboutText: parsed.settings.aboutText ?? null,
            contactEmail: parsed.settings.contactEmail ?? null,
            contactPhone: parsed.settings.contactPhone ?? null,
            contactWhatsapp: parsed.settings.contactWhatsapp ?? null,
            instagramUrl: parsed.settings.instagramUrl ?? null,
            facebookUrl: parsed.settings.facebookUrl ?? null,
            addressFull: parsed.settings.addressFull ?? null,
            isSitePublished: Boolean(parsed.settings.isSitePublished),
          }
        : null,
      services: Array.isArray(parsed.services)
        ? parsed.services.map((service) => ({
            id: service.id,
            title: service.title,
            shortDescription: service.shortDescription ?? null,
            imageUrl: service.imageUrl ?? null,
          }))
        : [],
      banners: Array.isArray(parsed.banners)
        ? parsed.banners.map((banner) => ({
            id: banner.id,
            title: banner.title ?? null,
            subtitle: banner.subtitle ?? null,
            imageUrl: banner.imageUrl ?? null,
            ctaLabel: banner.ctaLabel ?? null,
            ctaLink: banner.ctaLink ?? null,
          }))
        : [],
      home: normalizeSiteHomeContent(parsed.home),
    } satisfies SitePublicData;
  } catch {
    return null;
  }
}

export function getSiteMetaTitle(data: SitePublicData) {
  return (
    data.home.metaTitle ||
    data.settings?.heroTitle ||
    `${data.company.tradeName} | Grafica e comunicacao visual`
  );
}

export function getSiteMetaDescription(data: SitePublicData) {
  return (
    data.home.metaDescription ||
    data.settings?.heroSubtitle ||
    data.settings?.aboutText ||
    "Conheca os servicos da grafica, solicite um orcamento e fale pelo WhatsApp."
  );
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function normalizeCta(
  value: SiteCtaConfig | null | undefined,
  fallback: SiteCtaConfig,
): SiteCtaConfig {
  return {
    label: normalizeText(value?.label, fallback.label),
    action: isCtaAction(value?.action) ? value.action : fallback.action,
    href: normalizeOptionalText(value?.href ?? fallback.href ?? ""),
  };
}

function normalizeDifferentials(
  value: SiteDifferentialItem[] | null | undefined,
  fallback: SiteDifferentialItem[],
) {
  const source = Array.isArray(value) && value.length > 0 ? value.slice(0, 4) : fallback;

  return source.map((item, index) => ({
    title: normalizeText(item?.title, fallback[index]?.title ?? fallback[0].title),
    description: normalizeText(
      item?.description,
      fallback[index]?.description ?? fallback[0].description,
    ),
    icon: isDifferentialIcon(item?.icon)
      ? item.icon
      : fallback[index]?.icon ?? fallback[0].icon,
    isActive: item?.isActive ?? fallback[index]?.isActive ?? true,
  }));
}

function normalizeHowItWorks(
  value: SiteHowItWorksItem[] | null | undefined,
  fallback: SiteHowItWorksItem[],
) {
  const source = Array.isArray(value) && value.length > 0 ? value.slice(0, 3) : fallback;

  return source.map((item, index) => ({
    title: normalizeText(item?.title, fallback[index]?.title ?? fallback[0].title),
    description: normalizeText(
      item?.description,
      fallback[index]?.description ?? fallback[0].description,
    ),
    isActive: item?.isActive ?? fallback[index]?.isActive ?? true,
  }));
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || "";
}

function isCtaAction(value: string | undefined | null): value is SiteCtaAction {
  return value === "QUOTE_FORM" || value === "WHATSAPP" || value === "SERVICES" || value === "CONTACT" || value === "CUSTOM";
}

function isDifferentialIcon(
  value: string | undefined | null,
): value is SiteDifferentialItem["icon"] {
  return value === "speed" || value === "layers" || value === "materials" || value === "support";
}
