export type UserCreateInputDto = {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  roleIds: string[];
  isPlatformAdmin?: boolean;
};
