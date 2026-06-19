import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { Prisma } from "@prisma/client";
import type { CustomerCreateInputDto } from "@/models/dto/customer-create-input";
import type { CustomerStatusUpdateInputDto } from "@/models/dto/customer-status-update-input";
import type { CustomerUpdateInputDto } from "@/models/dto/customer-update-input";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class CustomerService extends BaseService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async createCustomer(
    context: TenantContext & { permissions: string[] },
    input: CustomerCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.customersCreate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create customers inside your company.");
    }

    const normalizedEmail = input.email?.trim().toLowerCase();
    if (normalizedEmail) {
      const existingByEmail = await this.customerRepository.findByEmail(
        input.companyId,
        normalizedEmail,
      );

      if (existingByEmail) {
        throw new Error("A customer with this e-mail already exists in this company.");
      }
    }

    const normalizedDocument = normalizeDocument(input.document);
    if (normalizedDocument) {
      const existingByDocument = await this.customerRepository.findByDocument(
        input.companyId,
        normalizedDocument,
      );

      if (existingByDocument) {
        throw new Error("A customer with this CPF/CNPJ already exists in this company.");
      }
    }

    return this.customerRepository.create(input);
  }

  async listCustomers(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
    options?: { includeInactive?: boolean },
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.customersView,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only list customers inside your company.");
    }

    return this.customerRepository.listByCompany(
      companyId,
      search?.trim() || undefined,
      options?.includeInactive ?? false,
    );
  }

  async getCustomer(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    customerId: string,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.customersView,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view customers inside your company.");
    }

    const customer = await this.customerRepository.findById(companyId, customerId);

    if (!customer) {
      throw new Error("Customer not found.");
    }

    return customer;
  }

  async updateCustomer(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    customerId: string,
    input: CustomerUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.customersUpdate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update customers inside your company.");
    }

    const existingCustomer = await this.customerRepository.findById(companyId, customerId);

    if (!existingCustomer) {
      throw new Error("Customer not found.");
    }

    const normalizedEmail = input.email?.trim().toLowerCase();
    if (normalizedEmail) {
      const existingByEmail = await this.customerRepository.findByEmailExcludingId(
        companyId,
        normalizedEmail,
        customerId,
      );

      if (existingByEmail) {
        throw new Error("A customer with this e-mail already exists in this company.");
      }
    }

    const normalizedDocument = normalizeDocument(input.document);
    if (normalizedDocument) {
      const existingByDocument = await this.customerRepository.findByDocumentExcludingId(
        companyId,
        normalizedDocument,
        customerId,
      );

      if (existingByDocument) {
        throw new Error("A customer with this CPF/CNPJ already exists in this company.");
      }
    }

    return this.customerRepository.update(companyId, customerId, input);
  }

  async updateCustomerStatus(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    customerId: string,
    input: CustomerStatusUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.customersUpdate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update customers inside your company.");
    }

    const existingCustomer = await this.customerRepository.findById(companyId, customerId);

    if (!existingCustomer) {
      throw new Error("Customer not found.");
    }

    return this.customerRepository.updateStatus(companyId, customerId, input.isActive);
  }

  async deleteCustomer(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    customerId: string,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.customersDelete,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only delete customers inside your company.");
    }

    const existingCustomer = await this.customerRepository.findById(companyId, customerId);

    if (!existingCustomer) {
      throw new Error("Customer not found.");
    }

    try {
      await this.customerRepository.delete(companyId, customerId);
    } catch (error) {
      const dependencySummary = await this.customerRepository.getDependencySummary(companyId, customerId);
      const hasLinkedChildren =
        dependencySummary.quotes > 0 ||
        dependencySummary.orders > 0 ||
        dependencySummary.financialEntries > 0;

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error(
          buildCustomerDeleteRestrictionMessage(dependencySummary),
        );
      }

      if (
        hasLinkedChildren &&
        error instanceof Error &&
        (error.message.includes("violates RESTRICT setting") ||
          error.message.includes("is referenced from table"))
      ) {
        throw new Error(buildCustomerDeleteRestrictionMessage(dependencySummary));
      }

      throw error;
    }
  }
}

function normalizeDocument(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replace(/[^0-9a-zA-Z]/g, "");
  return normalized || undefined;
}

function buildCustomerDeleteRestrictionMessage(summary: {
  quotes: number;
  orders: number;
  financialEntries: number;
}) {
  const parts = [
    summary.quotes ? `${summary.quotes} orcamento(s)` : null,
    summary.orders ? `${summary.orders} pedido(s)` : null,
    summary.financialEntries ? `${summary.financialEntries} lancamento(s)` : null,
  ].filter(Boolean);

  if (!parts.length) {
    return "Este cliente possui registros vinculados. Inative o cadastro em vez de excluir.";
  }

  return `Este cliente nao pode ser excluido porque ja possui ${parts.join(", ")} vinculados. Inative o cadastro em vez de excluir.`;
}
