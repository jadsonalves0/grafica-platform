import type { Company } from "@prisma/client";

import type { TenantContext } from "@/lib/tenant/tenant-context";
import { canAccessCompany } from "@/lib/tenant/tenant-context";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { BaseService } from "@/services/base/base-service";

export class CompanyService extends BaseService {
  constructor(private readonly companyRepository: CompanyRepository) {
    super();
  }

  async getCurrentCompany(
    context: TenantContext,
    companyId: string,
  ): Promise<Company> {
    const tenantContext = this.requireContext(context);

    if (!canAccessCompany(tenantContext, companyId)) {
      throw new Error("You do not have access to this company.");
    }

    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new Error("Company not found.");
    }

    return company;
  }
}
