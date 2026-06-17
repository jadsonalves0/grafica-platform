import { NextResponse } from "next/server";

import { UserController } from "@/controllers/users/user-controller";
import { PlaceholderPasswordHasher } from "@/lib/auth/password-hasher";
import { prisma } from "@/lib/db/prisma";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { RoleRepository } from "@/repositories/roles/role-repository";
import { UserManagementRepository } from "@/repositories/users/user-management-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { UserManagementService } from "@/services/users/user-management-service";

const controller = new UserController(
  new UserManagementService(
    new UserManagementRepository(prisma),
    new RoleRepository(prisma),
    new AuthorizationService(),
    new PlaceholderPasswordHasher(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
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
