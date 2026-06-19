import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { CompanyService } from "@/services/companies/company-service";

type CompanyOutput = {
  id: string;
  legalName: string;
  tradeName: string;
  slug: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  status: string;
};

export class CompanyController extends BaseController {
  constructor(private readonly companyService: CompanyService) {
    super();
  }

  async showCurrentCompany(
    context: TenantContext,
    companyId: string,
  ): Promise<ControllerResult<CompanyOutput>> {
    try {
      const company = await this.companyService.getCurrentCompany(context, companyId);

      return this.ok({
        id: company.id,
        legalName: company.legalName,
        tradeName: company.tradeName,
        slug: company.slug,
        document: company.document,
        email: company.email,
        phone: company.phone,
        whatsapp: company.whatsapp,
        status: company.status,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error while loading company.";

      return this.fail(message);
    }
  }
}
