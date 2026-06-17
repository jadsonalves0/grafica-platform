import type { Company, PrismaClient } from "@prisma/client";

import { TenantRepository } from "@/repositories/base/tenant-repository";

export class CompanyRepository extends TenantRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async findById(companyId: string): Promise<Company | null> {
    return this.db.company.findUnique({
      where: { id: companyId },
    });
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.db.company.findUnique({
      where: { slug },
    });
  }
}
