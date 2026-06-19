import { NextResponse } from "next/server";

import { AuditController } from "@/controllers/audit/audit-controller";
import { resolveRequestContext } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { apiErrorResponse } from "@/lib/http/api-error-response";
import { AuditRepository } from "@/repositories/audit/audit-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { AuditService } from "@/services/audit/audit-service";

const controller = new AuditController(
  new AuditService(new AuditRepository(prisma), new AuthorizationService()),
);

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const entityName = searchParams.get("entityName") ?? undefined;
    const action = parseAction(searchParams.get("action"));
    const result = await controller.list(context, companyId, { entityName, action });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function parseAction(value: string | null) {
  if (!value) {
    return undefined;
  }

  return ["CREATE", "UPDATE", "CONFIRM", "CANCEL", "REVERSE", "OVERRIDE"].includes(value)
    ? (value as "CREATE" | "UPDATE" | "CONFIRM" | "CANCEL" | "REVERSE" | "OVERRIDE")
    : undefined;
}
