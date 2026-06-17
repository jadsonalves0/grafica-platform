import type { AuthTokenType, PrismaClient } from "@prisma/client";

export class AuthTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    userId: string;
    tokenHash: string;
    type: AuthTokenType;
    expiresAt: Date;
  }) {
    return this.db.authToken.create({
      data: input,
    });
  }
}
