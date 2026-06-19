import { AuthenticationError } from "@/lib/auth/auth-errors";
import { prisma } from "@/lib/db/prisma";
import { CompanyUserRepository } from "@/repositories/companies/company-user-repository";
import { AuthSessionRepository } from "@/repositories/auth/auth-session-repository";

export type AuthenticatedRequestContext = {
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyTradeName: string;
  companySlug: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export async function resolveRequestContext(): Promise<AuthenticatedRequestContext> {
  const authSessionRepository = new AuthSessionRepository(prisma);
  const membershipRepository = new CompanyUserRepository(prisma);
  const session = await authSessionRepository.resolveCurrent();

  const membership = await membershipRepository.findActiveMembershipByCompanyId(
    session.userId,
    session.companyId,
  );

  if (!membership && !session.isPlatformAdmin) {
    throw new AuthenticationError("User is not active in the current company.");
  }

  const permissions = membership
    ? [...new Set(
        membership.userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
        ),
      )]
    : [];

  return {
    companyId: session.companyId,
    userId: session.userId,
    userName: session.userName,
    userEmail: session.userEmail,
    companyTradeName: session.companyTradeName,
    companySlug: session.companySlug,
    isPlatformAdmin: session.isPlatformAdmin,
    permissions,
  };
}
