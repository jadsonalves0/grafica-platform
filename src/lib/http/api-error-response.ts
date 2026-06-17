import { NextResponse } from "next/server";

export function apiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const status =
    message.toLowerCase().includes("session") || message.toLowerCase().includes("auth")
      ? 401
      : 400;

  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}
