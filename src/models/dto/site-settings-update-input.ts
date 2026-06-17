export type SiteSettingsUpdateInputDto = {
  companyId: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  addressFull?: string;
  isSitePublished?: boolean;
};
