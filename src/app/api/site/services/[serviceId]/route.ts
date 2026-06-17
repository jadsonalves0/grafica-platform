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

const controller = new SiteController(
  new SiteService(
    new SiteRepository(prisma),
    new CompanyRepository(prisma),
    new CustomerRepository(prisma),
    new QuoteRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const context = await resolveRequestContext();
    const body = await request.json();
    const { serviceId } = await params;
    const companyId = body.companyId ?? context.companyId;
    const result = await controller.updateService(context, companyId, serviceId, {
      ...body,
      companyId,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const { serviceId } = await params;
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const result = await controller.deleteService(context, companyId, serviceId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
