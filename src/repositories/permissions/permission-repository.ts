import type { PrismaClient } from "@prisma/client";

export class PermissionRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll() {
    return this.db.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });
  }
}
