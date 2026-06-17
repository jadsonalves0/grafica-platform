export type SiteBannerCreateInputDto = {
  companyId: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaLink?: string;
  sortOrder?: number;
};
