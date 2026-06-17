export type SiteBannerUpdateInputDto = {
  companyId: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaLink?: string;
  sortOrder?: number;
  isActive?: boolean;
};
