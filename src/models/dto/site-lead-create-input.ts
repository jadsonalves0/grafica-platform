export type SiteLeadCreateInputDto = {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  origin?: string;
  pageUrl?: string;
  pagePath?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  subject?: string;
  message?: string;
  requestedService?: string;
};
