import type { AuthSession, PrismaClient } from "@prisma/client";

import { AuthenticationError } from "@/lib/auth/auth-errors";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { hashOpaqueToken } from "@/lib/auth/session-token";
import { cookies } from "next/headers";

export class AuthSessionRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    userId: string;
    companyId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthSession> {
    return this.db.authSession.create({
      data: {
        userId: input.userId,
        companyId: input.companyId,
        token: hashOpaqueToken(input.token),
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async findActiveByToken(token: string) {
    return this.db.authSession.findFirst({
      where: {
        token: hashOpaqueToken(token),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
        company: true,
      },
    });
  }

  async resolveCurrent() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!sessionToken) {
      throw new AuthenticationError("Session not found.");
    }

    const session = await this.findActiveByToken(sessionToken);

    if (!session) {
      throw new AuthenticationError("Session is invalid or expired.");
    }

    await this.touch(session.id);

    return {
      sessionId: session.id,
      userId: session.userId,
      userName: session.user.name,
      userEmail: session.user.email,
      companyId: session.companyId,
      companyTradeName: session.company.tradeName,
      companySlug: session.company.slug,
      isPlatformAdmin: session.user.isPlatformAdmin,
    };
  }

  async touch(sessionId: string): Promise<void> {
    await this.db.authSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.authSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
