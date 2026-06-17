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

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const type = parseEntryType(searchParams.get("type"));
    const result = await controller.listCategories(context, companyId, type);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveRequestContext();
    const body = await request.json();
    const result = await controller.createCategory(context, {
      ...body,
      companyId: body.companyId ?? context.companyId,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function parseEntryType(value: string | null): "INCOME" | "EXPENSE" | undefined {
  return value === "INCOME" || value === "EXPENSE" ? value : undefined;
}
