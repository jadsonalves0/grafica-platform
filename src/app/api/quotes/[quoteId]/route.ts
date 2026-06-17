import { NextResponse } from "next/server";

import { QuoteController } from "@/controllers/quotes/quote-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { QuoteService } from "@/services/quotes/quote-service";

type RouteContext = {
  params: Promise<{
    quoteId: string;
  }>;
};

const controller = new QuoteController(
  new QuoteService(
    new QuoteRepository(prisma),
    new CustomerRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { quoteId } = await routeContext.params;
    const result = await controller.show(context, companyId, quoteId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { quoteId } = await routeContext.params;
    const body = await request.json();
    const result = await controller.update(context, companyId, quoteId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { quoteId } = await routeContext.params;
    const result = await controller.delete(context, companyId, quoteId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
