import type { AuditAction, PrismaClient } from "@prisma/client";

export class AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    companyId: string;
    userId?: string;
    entityName: string;
    recordId: string;
    action: AuditAction;
    previousData?: string;
    newData?: string;
    justification?: string;
  }) {
    return this.db.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        entityName: input.entityName,
        recordId: input.recordId,
        action: input.action,
        previousData: input.previousData,
        newData: input.newData,
        justification: input.justification,
      },
    });
  }

  async list(companyId: string, filters?: { entityName?: string; action?: AuditAction }) {
    return this.db.auditLog.findMany({
      where: {
        companyId,
        ...(filters?.entityName ? { entityName: filters.entityName } : {}),
        ...(filters?.action ? { action: filters.action } : {}),
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });
  }
}
