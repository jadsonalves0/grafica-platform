import { NextResponse } from "next/server";

import { RoleController } from "@/controllers/roles/role-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { PermissionRepository } from "@/repositories/permissions/permission-repository";
import { RoleRepository } from "@/repositories/roles/role-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { RoleService } from "@/services/roles/role-service";

const controller = new RoleController(
  new RoleService(
    new RoleRepository(prisma),
    new PermissionRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "permissions") {
      const result = await controller.listPermissions(context);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    const companyId = searchParams.get("companyId") ?? context.companyId;
    const result = await controller.list(context, companyId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveRequestContext();
    const body = await request.json();
    const result = await controller.create(context, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
