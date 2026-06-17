export type AuthSessionOutputDto = {
  expiresAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isPlatformAdmin: boolean;
  };
  company: {
    id: string;
    tradeName: string;
    slug: string;
  };
  permissions: string[];
};
