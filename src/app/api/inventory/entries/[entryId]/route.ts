import { NextResponse } from "next/server";

import { InventoryController } from "@/controllers/inventory/inventory-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { AuditRepository } from "@/repositories/audit/audit-repository";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { InventoryService } from "@/services/inventory/inventory-service";

type RouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

const controller = new InventoryController(
  new InventoryService(
    new InventoryRepository(prisma),
    new AuditRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { entryId } = await routeContext.params;
    const result = await controller.showEntry(context, companyId, entryId);
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
    const { entryId } = await routeContext.params;
    const body = await request.json();
    const result = await controller.updateEntry(context, companyId, entryId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
