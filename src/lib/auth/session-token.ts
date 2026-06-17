import { createHash, randomBytes } from "crypto";

export function generateSessionToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
