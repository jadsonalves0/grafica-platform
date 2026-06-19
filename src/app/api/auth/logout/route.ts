import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/db/prisma";
import { AuthSessionRepository } from "@/repositories/auth/auth-session-repository";

export async function POST() {
  const cookieStore = await cookies();
  const authSessionRepository = new AuthSessionRepository(prisma);

  try {
    const session = await authSessionRepository.resolveCurrent();
    await authSessionRepository.revoke(session.sessionId);
  } catch {
    // If the session is already invalid, just clear the cookie.
  }

  cookieStore.delete(AUTH_COOKIE_NAME);

  return NextResponse.json({
    success: true,
    message: "Sessao encerrada com sucesso.",
  });
}
