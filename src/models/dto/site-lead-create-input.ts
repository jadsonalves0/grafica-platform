export type SiteLeadCreateInputDto = {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  subject?: string;
  message?: string;
  requestedService?: string;
};
