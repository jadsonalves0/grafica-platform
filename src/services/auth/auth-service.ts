import type { AuthTokenType } from "@prisma/client";

import { AuthenticationError } from "@/lib/auth/auth-errors";
import type { PasswordHasher } from "@/lib/auth/password-hasher";
import { generateSessionToken, hashOpaqueToken } from "@/lib/auth/session-token";
import { SESSION_TTL_IN_DAYS } from "@/lib/auth/session-cookie";
import { AuthSessionRepository } from "@/repositories/auth/auth-session-repository";
import { AuthTokenRepository } from "@/repositories/auth/auth-token-repository";
import { CompanyUserRepository } from "@/repositories/companies/company-user-repository";
import { UserRepository } from "@/repositories/users/user-repository";
import { BaseService } from "@/services/base/base-service";

type LoginInput = {
  email: string;
  password: string;
  companySlug: string;
  ipAddress?: string;
  userAgent?: string;
};

export class AuthService extends BaseService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {
    super();
  }

  async login(input: LoginInput) {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || user.status !== "ACTIVE") {
      throw new AuthenticationError("Invalid credentials.");
    }

    const isValidPassword = await this.passwordHasher.compare(
      input.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new AuthenticationError("Invalid credentials.");
    }

    const membership = await this.companyUserRepository.findActiveMembership(
      user.id,
      input.companySlug,
    );

    if (!membership) {
      throw new AuthenticationError("User does not belong to this company.");
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_IN_DAYS * 24 * 60 * 60 * 1000);

    await this.authSessionRepository.create({
      userId: user.id,
      companyId: membership.companyId,
      token,
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    await this.userRepository.markLastLogin(user.id);

    const permissions = membership.userRoles.flatMap((userRole) =>
      userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
    );

    return {
      token,
      expiresAt,
      user,
      company: membership.company,
      permissions: [...new Set(permissions)],
    };
  }

  async createRecoveryToken(userId: string, type: AuthTokenType) {
    const rawToken = generateSessionToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await this.authTokenRepository.create({
      userId,
      tokenHash,
      type,
      expiresAt,
    });

    return {
      rawToken,
      expiresAt,
    };
  }
}
