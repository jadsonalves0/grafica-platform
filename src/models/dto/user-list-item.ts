export type UserListItemDto = {
  id: string;
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
};
