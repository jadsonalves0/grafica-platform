import { NextResponse } from "next/server";

export function apiErrorResponse(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Unexpected error.";
  const normalizedMessage = rawMessage.toLowerCase();

  const isAuthError =
    normalizedMessage.includes("session") || normalizedMessage.includes("auth");
  const isDatabaseStructureError =
    normalizedMessage.includes("invalid `prisma.") ||
    normalizedMessage.includes("does not exist in the current database") ||
    normalizedMessage.includes("the table `public.") ||
    normalizedMessage.includes("the column `");

  const message = isDatabaseStructureError
    ? "A estrutura do banco de dados esta desatualizada em relacao ao sistema. Aplique as migrations mais recentes e tente novamente."
    : rawMessage;

  const status = isAuthError ? 401 : isDatabaseStructureError ? 500 : 400;

  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}
