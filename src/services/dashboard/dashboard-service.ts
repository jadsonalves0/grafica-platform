import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { DashboardRepository } from "@/repositories/dashboard/dashboard-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class DashboardService extends BaseService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async getSummary(
    context: TenantContext & { permissions: string[] },
    companyId: string,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.companiesView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view the dashboard inside your company.");
    }

    return this.dashboardRepository.getSummary(companyId);
  }
}
