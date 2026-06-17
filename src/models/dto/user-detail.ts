export type UserDetailDto = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  isPlatformAdmin: boolean;
  roles: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  createdAt: string;
  updatedAt: string;
};
