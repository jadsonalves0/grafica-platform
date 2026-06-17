import type { PrismaClient } from "@prisma/client";

export abstract class TenantRepository {
  protected constructor(protected readonly db: PrismaClient) {}

  protected scopeWhere<T extends object>(companyId: string, where?: T): T & { companyId: string } {
    return {
      companyId,
      ...(where ?? {}),
    } as T & { companyId: string };
  }
}
