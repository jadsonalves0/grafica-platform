import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { DashboardSummaryDto } from "@/models/dto/dashboard-summary";
import { DashboardService } from "@/services/dashboard/dashboard-service";

type DashboardContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class DashboardController extends BaseController {
  constructor(private readonly dashboardService: DashboardService) {
    super();
  }

  async summary(
    context: DashboardContext,
    companyId: string,
  ): Promise<ControllerResult<DashboardSummaryDto>> {
    try {
      const summary = await this.dashboardService.getSummary(context, companyId);
      return this.ok(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}
