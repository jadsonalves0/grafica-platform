import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { AuthController } from "@/controllers/auth/auth-controller";
import { PlaceholderPasswordHasher } from "@/lib/auth/password-hasher";
import { AUTH_COOKIE_NAME, SESSION_TTL_IN_DAYS } from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/db/prisma";
import { AuthSessionRepository } from "@/repositories/auth/auth-session-repository";
import { AuthTokenRepository } from "@/repositories/auth/auth-token-repository";
import { CompanyUserRepository } from "@/repositories/companies/company-user-repository";
import { UserRepository } from "@/repositories/users/user-repository";
import { AuthService } from "@/services/auth/auth-service";

const controller = new AuthController(
  new AuthService(
    new UserRepository(prisma),
    new CompanyUserRepository(prisma),
    new AuthSessionRepository(prisma),
    new AuthTokenRepository(prisma),
    new PlaceholderPasswordHasher(),
  ),
);

export async function POST(request: Request) {
  const body = await request.json();
  const headerStore = await headers();
  const cookieStore = await cookies();

  const result = await controller.login(body, {
    ipAddress: headerStore.get("x-forwarded-for") ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
  });

  if (!result.success || !result.data) {
    return NextResponse.json(result, { status: 401 });
  }

  cookieStore.set(AUTH_COOKIE_NAME, result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_IN_DAYS * 24 * 60 * 60,
  });

  const { token: _token, ...publicSession } = result.data;

  return NextResponse.json({
    ...result,
    data: publicSession,
  });
}
