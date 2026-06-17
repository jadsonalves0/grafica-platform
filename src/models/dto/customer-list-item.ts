export type CustomerListItemDto = {
  id: string;
  name: string;
  isActive: boolean;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
};
