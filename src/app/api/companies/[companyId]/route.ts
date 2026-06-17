import { NextResponse } from "next/server";

import { CompanyController } from "@/controllers/companies/company-controller";
import { prisma } from "@/lib/db/prisma";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CompanyService } from "@/services/companies/company-service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

const controller = new CompanyController(
  new CompanyService(new CompanyRepository(prisma)),
);

export async function GET(_: Request, context: RouteContext) {
  const { companyId } = await context.params;

  const result = await controller.showCurrentCompany(
    {
      companyId,
      userId: "development-user",
      isPlatformAdmin: true,
    },
    companyId,
  );

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
