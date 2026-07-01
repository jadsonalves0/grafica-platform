import { NextResponse } from "next/server";

import { SupplierController } from "@/controllers/suppliers/supplier-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { SupplierRepository } from "@/repositories/suppliers/supplier-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { SupplierService } from "@/services/suppliers/supplier-service";

const controller = new SupplierController(
  new SupplierService(
    new SupplierRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const search = searchParams.get("search") ?? undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";
    const result = await controller.list(context, companyId, search, { includeInactive });
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
