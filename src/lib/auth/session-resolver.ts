import { AuthSessionRepository } from "@/repositories/auth/auth-session-repository";
import type { PermissionCode } from "@/lib/permissions/permission-types";

export async function resolveCurrentSession(
  authSessionRepository: AuthSessionRepository,
): Promise<{
  sessionId: string;
  userId: string;
  companyId: string;
  permissions: PermissionCode[];
  isPlatformAdmin: boolean;
}> {
  return {
    ...(await authSessionRepository.resolveCurrent()),
    permissions: [],
  };
}
