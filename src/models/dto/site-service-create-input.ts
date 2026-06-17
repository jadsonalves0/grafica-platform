export type SiteServiceCreateInputDto = {
  companyId: string;
  title: string;
  shortDescription?: string;
  imageUrl?: string;
  sortOrder?: number;
};
