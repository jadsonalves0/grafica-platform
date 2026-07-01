export type SupplierListItemDto = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  displayName: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  contactName?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
  createdAt: string;
};
