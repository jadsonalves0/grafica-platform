export type RoleListItemDto = {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  permissionCodes: string[];
};
