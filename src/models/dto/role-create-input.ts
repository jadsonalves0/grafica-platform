export type RoleCreateInputDto = {
  companyId?: string | null;
  name: string;
  code: string;
  permissionCodes: string[];
};
