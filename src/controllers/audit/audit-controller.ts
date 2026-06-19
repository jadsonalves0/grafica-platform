import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { AuditLogListItemDto } from "@/models/dto/audit-log-list-item";
import { AuditService } from "@/services/audit/audit-service";

type AuditContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class AuditController extends BaseController {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  async list(
    context: AuditContext,
    companyId: string,
    filters?: {
      entityName?: string;
      action?: "CREATE" | "UPDATE" | "CONFIRM" | "CANCEL" | "REVERSE" | "OVERRIDE";
    },
  ): Promise<ControllerResult<AuditLogListItemDto[]>> {
    try {
      const logs = await this.auditService.list(context, companyId, filters);
      return this.ok(
        logs.map((log) => ({
          id: log.id,
          entityName: log.entityName,
          recordId: log.recordId,
          action: log.action,
          previousData: log.previousData,
          newData: log.newData,
          justification: log.justification,
          userName: log.user?.name ?? null,
          createdAt: log.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }
}
