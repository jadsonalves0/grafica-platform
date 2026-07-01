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

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { entryId } = await routeContext.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Selecione um arquivo para anexar a entrada." },
        { status: 400 },
      );
    }

    const content = new Uint8Array(await file.arrayBuffer());
    const result = await controller.addEntryAttachment(context, companyId, entryId, {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      content,
      documentType: typeof documentType === "string" ? documentType : undefined,
      source: "MANUAL_UPLOAD",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
