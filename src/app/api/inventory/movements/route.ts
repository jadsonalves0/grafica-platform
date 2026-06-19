import { NextResponse } from "next/server";

import { InventoryController } from "@/controllers/inventory/inventory-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { AuditRepository } from "@/repositories/audit/audit-repository";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { InventoryService } from "@/services/inventory/inventory-service";

const controller = new InventoryController(
  new InventoryService(
    new InventoryRepository(prisma),
    new AuditRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const productId = searchParams.get("productId") ?? undefined;
    const result = await controller.listMovements(context, companyId, productId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveRequestContext();
    const body = await request.json();
    const result = await controller.createMovement(context, {
      ...body,
      companyId: body.companyId ?? context.companyId,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
