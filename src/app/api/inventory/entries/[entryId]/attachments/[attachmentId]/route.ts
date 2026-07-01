import { readFile } from "node:fs/promises";
import path from "node:path";

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
    attachmentId: string;
  }>;
};

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "operational-documents");

const controller = new InventoryController(
  new InventoryService(
    new InventoryRepository(prisma),
    new AuditRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { entryId, attachmentId } = await routeContext.params;
    const result = await controller.showEntryAttachment(context, companyId, entryId, attachmentId);

    if (!result.success || !result.data) {
      return NextResponse.json(result, { status: 404 });
    }

    const absolutePath = path.resolve(process.cwd(), result.data.storagePath);
    if (!absolutePath.startsWith(STORAGE_ROOT)) {
      return NextResponse.json(
        {
          success: false,
          message: "Caminho do anexo fora da area permitida.",
        },
        { status: 400 },
      );
    }

    const fileBuffer = await readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.data.mimeType || "application/octet-stream",
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(result.data.fileName)}`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, routeContext: RouteContext) {
  try {
    const context = await resolveRequestContext();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? context.companyId;
    const { entryId, attachmentId } = await routeContext.params;
    const result = await controller.removeEntryAttachment(
      context,
      companyId,
      entryId,
      attachmentId,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
