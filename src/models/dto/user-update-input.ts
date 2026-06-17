export type UserUpdateInputDto = {
  name: string;
  phone?: string;
  status: "ACTIVE" | "INVITED" | "BLOCKED";
  roleIds: string[];
  isPlatformAdmin?: boolean;
};
