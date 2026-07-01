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

export async function POST(request: Request) {
  try {
    const context = await resolveRequestContext();
    const formData = await request.formData();
    const file = formData.get("file");
    const xmlTextField = formData.get("xml");
    const xmlContent =
      file instanceof File
        ? await file.text()
        : typeof xmlTextField === "string"
          ? xmlTextField
          : "";

    const result = await controller.importEntryXml(context, {
      companyId: formData.get("companyId")?.toString() ?? context.companyId,
      xmlContent,
      fileName: file instanceof File ? file.name : "importacao.xml",
      mimeType: file instanceof File ? file.type : "application/xml",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
