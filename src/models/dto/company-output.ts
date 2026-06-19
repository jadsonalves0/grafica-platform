export type CompanyOutputDto = {
  id: string;
  legalName: string;
  tradeName: string;
  slug: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  status: string;
};
