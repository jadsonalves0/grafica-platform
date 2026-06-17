import { NextResponse } from "next/server";

import { RoleController } from "@/controllers/roles/role-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { PermissionRepository } from "@/repositories/permissions/permission-repository";
import { RoleRepository } from "@/repositories/roles/role-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { RoleService } from "@/services/roles/role-service";

type RouteContext = {
  params: Promise<{
    roleId: string;
  }>;
};

const controller = new RoleController(
  new RoleService(
    new RoleRepository(prisma),
    new PermissionRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { roleId } = await routeContext.params;
    const result = await controller.show(context, companyId, roleId);
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
    const { roleId } = await routeContext.params;
    const body = await request.json();
    const result = await controller.update(context, companyId, roleId, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
