export type CustomerDetailDto = {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  addressZipCode?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};
