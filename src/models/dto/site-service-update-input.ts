export type SiteServiceUpdateInputDto = {
  companyId: string;
  title: string;
  shortDescription?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};
