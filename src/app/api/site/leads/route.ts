import { NextResponse } from "next/server";
import type { SiteLeadStatus } from "@prisma/client";

import { SiteController } from "@/controllers/site/site-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { SiteRepository } from "@/repositories/site/site-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { SiteService } from "@/services/site/site-service";

const controller = new SiteController(
  new SiteService(
    new SiteRepository(prisma),
    new CompanyRepository(prisma),
    new CustomerRepository(prisma),
    new QuoteRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const status = parseSiteLeadStatus(searchParams.get("status"));
    const result = await controller.listLeads(context, companyId, status);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function parseSiteLeadStatus(value: string | null): SiteLeadStatus | undefined {
  if (!value) {
    return undefined;
  }

  return ["NEW", "CONTACTED", "CONVERTED", "ARCHIVED"].includes(value)
    ? (value as SiteLeadStatus)
    : undefined;
}
