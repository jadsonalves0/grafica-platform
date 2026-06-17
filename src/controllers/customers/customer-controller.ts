import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import { formatCpfCnpj, formatPhone, formatZipCode, normalizeStateCode } from "@/lib/forms/br-utils";
import type { CustomerCreateInputDto } from "@/models/dto/customer-create-input";
import type { CustomerDetailDto } from "@/models/dto/customer-detail";
import type { CustomerListItemDto } from "@/models/dto/customer-list-item";
import type { CustomerStatusUpdateInputDto } from "@/models/dto/customer-status-update-input";
import type { CustomerUpdateInputDto } from "@/models/dto/customer-update-input";
import {
  createCustomerSchema,
  updateCustomerStatusSchema,
  updateCustomerSchema,
} from "@/models/validators/customer-validator";
import { CustomerService } from "@/services/customers/customer-service";

type CustomerContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class CustomerController extends BaseController {
  constructor(private readonly customerService: CustomerService) {
    super();
  }

  async create(
    context: CustomerContext,
    input: CustomerCreateInputDto,
  ): Promise<ControllerResult<CustomerDetailDto>> {
    try {
      const payload = createCustomerSchema.parse(input);
      const customer = await this.customerService.createCustomer(context, payload);

      return this.ok(mapCustomerDetail(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async list(
    context: CustomerContext,
    companyId: string,
    search?: string,
    options?: { includeInactive?: boolean },
  ): Promise<ControllerResult<CustomerListItemDto[]>> {
    try {
      const customers = await this.customerService.listCustomers(
        context,
        companyId,
        search,
        options,
      );

      return this.ok(
        customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          isActive: customer.isActive,
          document: customer.document ? formatCpfCnpj(customer.document) : null,
          email: customer.email,
          phone: customer.phone ? formatPhone(customer.phone) : null,
          whatsapp: customer.whatsapp ? formatPhone(customer.whatsapp) : null,
          city: customer.addressCity,
          state: customer.addressState ? normalizeStateCode(customer.addressState) : null,
          createdAt: customer.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateStatus(
    context: CustomerContext,
    companyId: string,
    customerId: string,
    input: CustomerStatusUpdateInputDto,
  ): Promise<ControllerResult<CustomerDetailDto>> {
    try {
      const payload = updateCustomerStatusSchema.parse(input);
      const customer = await this.customerService.updateCustomerStatus(
        context,
        companyId,
        customerId,
        payload,
      );

      return this.ok(mapCustomerDetail(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async show(
    context: CustomerContext,
    companyId: string,
    customerId: string,
  ): Promise<ControllerResult<CustomerDetailDto>> {
    try {
      const customer = await this.customerService.getCustomer(context, companyId, customerId);
      return this.ok(mapCustomerDetail(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async update(
    context: CustomerContext,
    companyId: string,
    customerId: string,
    input: CustomerUpdateInputDto,
  ): Promise<ControllerResult<CustomerDetailDto>> {
    try {
      const payload = updateCustomerSchema.parse(input);
      const customer = await this.customerService.updateCustomer(
        context,
        companyId,
        customerId,
        payload,
      );

      return this.ok(mapCustomerDetail(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async delete(
    context: CustomerContext,
    companyId: string,
    customerId: string,
  ): Promise<ControllerResult<{ deleted: true }>> {
    try {
      await this.customerService.deleteCustomer(context, companyId, customerId);
      return this.ok({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapCustomerDetail(customer: {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressZipCode: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CustomerDetailDto {
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    isActive: customer.isActive,
    document: customer.document ? formatCpfCnpj(customer.document) : null,
    email: customer.email,
    phone: customer.phone ? formatPhone(customer.phone) : null,
    whatsapp: customer.whatsapp ? formatPhone(customer.whatsapp) : null,
    addressZipCode: customer.addressZipCode ? formatZipCode(customer.addressZipCode) : null,
    addressStreet: customer.addressStreet,
    addressNumber: customer.addressNumber,
    addressDistrict: customer.addressDistrict,
    addressCity: customer.addressCity,
    addressState: customer.addressState ? normalizeStateCode(customer.addressState) : null,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}
