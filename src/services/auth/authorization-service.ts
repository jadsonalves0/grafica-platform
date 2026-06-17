import { AuthorizationError } from "@/lib/auth/auth-errors";
import type { PermissionCode } from "@/lib/permissions/permission-types";

export class AuthorizationService {
  ensurePermission(
    grantedPermissions: string[],
    requiredPermission: PermissionCode,
  ): void {
    if (!grantedPermissions.includes(requiredPermission)) {
      throw new AuthorizationError();
    }
  }
}
