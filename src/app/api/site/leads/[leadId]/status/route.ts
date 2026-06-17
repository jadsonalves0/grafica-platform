import { NextResponse } from "next/server";

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

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

const controller = new SiteController(
  new SiteService(
    new SiteRepository(prisma),
    new CompanyRepository(prisma),
    new CustomerRepository(prisma),
    new QuoteRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { leadId } = await routeContext.params;
    const body = await request.json();
    const result = await controller.updateLeadStatus(context, companyId, leadId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action || !["convert", "quote"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported action.",
        },
        { status: 400 },
      );
    }

    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { leadId } = await routeContext.params;
    const body = await request.json().catch(() => ({}));
    const result =
      action === "convert"
        ? await controller.convertLead(context, companyId, leadId, body)
        : await controller.convertLeadToQuote(context, companyId, leadId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
