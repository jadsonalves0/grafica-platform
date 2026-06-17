import { NextResponse } from "next/server";

import { FinancialController } from "@/controllers/financial/financial-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { FinancialRepository } from "@/repositories/financial/financial-repository";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { OrderRepository } from "@/repositories/orders/order-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { FinancialService } from "@/services/financial/financial-service";

type RouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

const controller = new FinancialController(
  new FinancialService(
    new FinancialRepository(prisma),
    new CustomerRepository(prisma),
    new InventoryRepository(prisma),
    new OrderRepository(prisma),
    new QuoteRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { entryId } = await routeContext.params;
    const body = await request.json();
    const result = await controller.updateEntryStatus(context, companyId, entryId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
