import type { AuthSession, Company, User } from "@prisma/client";

import type { PermissionCode } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export type CurrentSession = {
  token: string;
  session: AuthSession;
  user: User;
  company: Company;
  permissions: PermissionCode[];
  tenantContext: TenantContext;
};
