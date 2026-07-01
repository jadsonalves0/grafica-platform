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

type Params = {
  params: Promise<{ supplierId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const context = await resolveRequestContext();
    const { supplierId } = await params;
    const result = await controller.show(context, context.companyId, supplierId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const context = await resolveRequestContext();
    const body = await request.json();
    const { supplierId } = await params;
    const result = await controller.update(context, context.companyId, supplierId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const context = await resolveRequestContext();
    const { supplierId } = await params;
    const result = await controller.delete(context, context.companyId, supplierId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
