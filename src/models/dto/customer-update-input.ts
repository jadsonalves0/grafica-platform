export type CustomerUpdateInputDto = {
  name: string;
  isActive?: boolean;
  document?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  addressZipCode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  notes?: string;
};
