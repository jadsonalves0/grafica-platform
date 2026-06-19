import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { AuditRepository } from "@/repositories/audit/audit-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class AuditService extends BaseService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async list(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    filters?: {
      entityName?: string;
      action?: "CREATE" | "UPDATE" | "CONFIRM" | "CANCEL" | "REVERSE" | "OVERRIDE";
    },
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.companiesView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view audit logs inside your company.");
    }

    return this.auditRepository.list(companyId, filters);
  }
}
