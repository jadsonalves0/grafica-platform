import type { PrismaClient, User } from "@prisma/client";

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async markLastLogin(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }
}
