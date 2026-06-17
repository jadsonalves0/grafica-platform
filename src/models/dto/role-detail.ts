export type RoleDetailDto = {
  id: string;
  companyId?: string | null;
  name: string;
  code: string;
  isSystem: boolean;
  permissionCodes: string[];
  createdAt: string;
};
