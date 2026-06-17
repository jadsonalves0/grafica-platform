import { NextResponse } from "next/server";

import { OrderController } from "@/controllers/orders/order-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { OrderRepository } from "@/repositories/orders/order-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { OrderService } from "@/services/orders/order-service";

const controller = new OrderController(
  new OrderService(
    new OrderRepository(prisma),
    new QuoteRepository(prisma),
    new CustomerRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const search = searchParams.get("search") ?? undefined;
    const result = await controller.list(context, companyId, search);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveRequestContext();
    const body = await request.json();
    const result = await controller.create(context, {
      ...body,
      companyId: body.companyId ?? context.companyId,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
