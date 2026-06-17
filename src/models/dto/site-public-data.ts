export type SitePublicDataDto = {
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
};
