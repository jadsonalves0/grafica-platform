import { NextResponse } from "next/server";

import { orderController } from "@/app/api/orders/_controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { apiErrorResponse } from "@/lib/http/api-error-response";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { orderId } = await routeContext.params;
    const result = await orderController.show(context, companyId, orderId);
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
    const { orderId } = await routeContext.params;
    const body = await request.json();
    const result = await orderController.update(context, companyId, orderId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
