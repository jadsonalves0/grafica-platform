import { NextResponse } from "next/server";

import { CompanyController } from "@/controllers/companies/company-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CompanyService } from "@/services/companies/company-service";

const controller = new CompanyController(
  new CompanyService(new CompanyRepository(prisma)),
);

export async function GET() {
  try {
    const context = await resolveRequestContext();
    const result = await controller.showCurrentCompany(context, context.companyId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
