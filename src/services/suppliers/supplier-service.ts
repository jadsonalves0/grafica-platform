import { Prisma } from "@prisma/client";

import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { SupplierCreateInputDto } from "@/models/dto/supplier-create-input";
import type { SupplierStatusUpdateInputDto } from "@/models/dto/supplier-status-update-input";
import type { SupplierUpdateInputDto } from "@/models/dto/supplier-update-input";
import { SupplierRepository } from "@/repositories/suppliers/supplier-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class SupplierService extends BaseService {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async createSupplier(
    context: TenantContext & { permissions: string[] },
    input: SupplierCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create suppliers inside your company.");
    }

    await this.ensureUniqueDocument(input.companyId, input.document);
    return this.supplierRepository.create(input);
  }

  async listSuppliers(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
    options?: { includeInactive?: boolean },
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only list suppliers inside your company.");
    }

    return this.supplierRepository.listByCompany(
      companyId,
      search?.trim() || undefined,
      options?.includeInactive ?? false,
    );
  }

  async getSupplier(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    supplierId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view suppliers inside your company.");
    }

    const supplier = await this.supplierRepository.findById(companyId, supplierId);
    if (!supplier) {
      throw new Error("Fornecedor nao encontrado.");
    }

    return supplier;
  }

  async updateSupplier(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    supplierId: string,
    input: SupplierUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update suppliers inside your company.");
    }

    const existingSupplier = await this.supplierRepository.findById(companyId, supplierId);
    if (!existingSupplier) {
      throw new Error("Fornecedor nao encontrado.");
    }

    await this.ensureUniqueDocument(companyId, input.document, supplierId);
    return this.supplierRepository.update(companyId, supplierId, input);
  }

  async updateSupplierStatus(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    supplierId: string,
    input: SupplierStatusUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update suppliers inside your company.");
    }

    const existingSupplier = await this.supplierRepository.findById(companyId, supplierId);
    if (!existingSupplier) {
      throw new Error("Fornecedor nao encontrado.");
    }

    return this.supplierRepository.updateStatus(companyId, supplierId, input.isActive);
  }

  async deleteSupplier(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    supplierId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.inventoryUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only delete suppliers inside your company.");
    }

    const existingSupplier = await this.supplierRepository.findById(companyId, supplierId);
    if (!existingSupplier) {
      throw new Error("Fornecedor nao encontrado.");
    }

    try {
      await this.supplierRepository.delete(companyId, supplierId);
    } catch (error) {
      const dependencySummary = await this.supplierRepository.getDependencySummary(companyId, supplierId);
      const hasLinkedChildren =
        dependencySummary.inventoryEntries > 0 || dependencySummary.supplierItemMappings > 0;

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error(buildSupplierDeleteRestrictionMessage(dependencySummary));
      }

      if (
        hasLinkedChildren &&
        error instanceof Error &&
        (error.message.includes("violates RESTRICT setting") ||
          error.message.includes("is referenced from table"))
      ) {
        throw new Error(buildSupplierDeleteRestrictionMessage(dependencySummary));
      }

      throw error;
    }
  }

  private async ensureUniqueDocument(companyId: string, document?: string, supplierId?: string) {
    const normalized = document?.trim();
    if (!normalized) {
      return;
    }

    const duplicated = supplierId
      ? await this.supplierRepository.findByDocumentExcludingId(companyId, normalized, supplierId)
      : await this.supplierRepository.findByDocument(companyId, normalized);

    if (duplicated) {
      throw new Error("Ja existe um fornecedor com este CPF/CNPJ nesta empresa.");
    }
  }
}

function buildSupplierDeleteRestrictionMessage(summary: {
  inventoryEntries: number;
  supplierItemMappings: number;
}) {
  const parts = [
    summary.inventoryEntries ? `${summary.inventoryEntries} entrada(s)` : null,
    summary.supplierItemMappings ? `${summary.supplierItemMappings} vinculo(s) fornecedor-item` : null,
  ].filter(Boolean);

  return `Este fornecedor nao pode ser excluido porque ja esta vinculado a ${parts.join(" e ")}. Inative o cadastro para preservar o historico.`;
}
