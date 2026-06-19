import { NextResponse } from "next/server";

import { CompanyController } from "@/controllers/companies/company-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
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
  try {
    const requestContext = await resolveRequestContext();
    const { companyId } = await context.params;
    const result = await controller.showCurrentCompany(requestContext, companyId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
