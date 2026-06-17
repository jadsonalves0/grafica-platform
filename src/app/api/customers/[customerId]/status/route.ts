import { NextResponse } from "next/server";

import { CustomerController } from "@/controllers/customers/customer-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { CustomerService } from "@/services/customers/customer-service";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

const controller = new CustomerController(
  new CustomerService(
    new CustomerRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { customerId } = await routeContext.params;
    const body = await request.json();
    const result = await controller.updateStatus(context, companyId, customerId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
