import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import { formatCpfCnpj, formatPhone, formatZipCode, normalizeStateCode } from "@/lib/forms/br-utils";
import type { SupplierCreateInputDto } from "@/models/dto/supplier-create-input";
import type { SupplierDetailDto } from "@/models/dto/supplier-detail";
import type { SupplierListItemDto } from "@/models/dto/supplier-list-item";
import type { SupplierStatusUpdateInputDto } from "@/models/dto/supplier-status-update-input";
import type { SupplierUpdateInputDto } from "@/models/dto/supplier-update-input";
import {
  createSupplierSchema,
  updateSupplierSchema,
  updateSupplierStatusSchema,
} from "@/models/validators/supplier-validator";
import { SupplierService } from "@/services/suppliers/supplier-service";

type SupplierContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class SupplierController extends BaseController {
  constructor(private readonly supplierService: SupplierService) {
    super();
  }

  async create(
    context: SupplierContext,
    input: SupplierCreateInputDto,
  ): Promise<ControllerResult<SupplierDetailDto>> {
    try {
      const payload = createSupplierSchema.parse(input);
      const supplier = await this.supplierService.createSupplier(context, payload);
      return this.ok(mapSupplierDetail(supplier));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async list(
    context: SupplierContext,
    companyId: string,
    search?: string,
    options?: { includeInactive?: boolean },
  ): Promise<ControllerResult<SupplierListItemDto[]>> {
    try {
      const suppliers = await this.supplierService.listSuppliers(context, companyId, search, options);
      return this.ok(
        suppliers.map((supplier) => ({
          id: supplier.id,
          legalName: supplier.legalName,
          tradeName: supplier.tradeName,
          displayName: supplier.tradeName?.trim() || supplier.legalName,
          document: supplier.document ? formatCpfCnpj(supplier.document) : null,
          email: supplier.email,
          phone: supplier.phone ? formatPhone(supplier.phone) : null,
          whatsapp: supplier.whatsapp ? formatPhone(supplier.whatsapp) : null,
          contactName: supplier.contactName,
          city: supplier.addressCity,
          state: supplier.addressState ? normalizeStateCode(supplier.addressState) : null,
          isActive: supplier.isActive,
          createdAt: supplier.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async show(
    context: SupplierContext,
    companyId: string,
    supplierId: string,
  ): Promise<ControllerResult<SupplierDetailDto>> {
    try {
      const supplier = await this.supplierService.getSupplier(context, companyId, supplierId);
      return this.ok(mapSupplierDetail(supplier));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async update(
    context: SupplierContext,
    companyId: string,
    supplierId: string,
    input: SupplierUpdateInputDto,
  ): Promise<ControllerResult<SupplierDetailDto>> {
    try {
      const payload = updateSupplierSchema.parse(input);
      const supplier = await this.supplierService.updateSupplier(context, companyId, supplierId, payload);
      return this.ok(mapSupplierDetail(supplier));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateStatus(
    context: SupplierContext,
    companyId: string,
    supplierId: string,
    input: SupplierStatusUpdateInputDto,
  ): Promise<ControllerResult<SupplierDetailDto>> {
    try {
      const payload = updateSupplierStatusSchema.parse(input);
      const supplier = await this.supplierService.updateSupplierStatus(context, companyId, supplierId, payload);
      return this.ok(mapSupplierDetail(supplier));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async delete(
    context: SupplierContext,
    companyId: string,
    supplierId: string,
  ): Promise<ControllerResult<{ deleted: true }>> {
    try {
      await this.supplierService.deleteSupplier(context, companyId, supplierId);
      return this.ok({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapSupplierDetail(supplier: {
  id: string;
  companyId: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  contactName: string | null;
  addressZipCode: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SupplierDetailDto {
  return {
    id: supplier.id,
    companyId: supplier.companyId,
    legalName: supplier.legalName,
    tradeName: supplier.tradeName,
    document: supplier.document ? formatCpfCnpj(supplier.document) : null,
    email: supplier.email,
    phone: supplier.phone ? formatPhone(supplier.phone) : null,
    whatsapp: supplier.whatsapp ? formatPhone(supplier.whatsapp) : null,
    contactName: supplier.contactName,
    addressZipCode: supplier.addressZipCode ? formatZipCode(supplier.addressZipCode) : null,
    addressStreet: supplier.addressStreet,
    addressNumber: supplier.addressNumber,
    addressDistrict: supplier.addressDistrict,
    addressCity: supplier.addressCity,
    addressState: supplier.addressState ? normalizeStateCode(supplier.addressState) : null,
    notes: supplier.notes,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}
