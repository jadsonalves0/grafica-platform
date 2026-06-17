import { NextResponse } from "next/server";

import { DashboardController } from "@/controllers/dashboard/dashboard-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { DashboardRepository } from "@/repositories/dashboard/dashboard-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { DashboardService } from "@/services/dashboard/dashboard-service";

const controller = new DashboardController(
  new DashboardService(
    new DashboardRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const result = await controller.summary(context, companyId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
