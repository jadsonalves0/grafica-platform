import { QuoteStatus } from "@prisma/client";

import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { QuoteCreateInputDto } from "@/models/dto/quote-create-input";
import type { QuoteUpdateInputDto } from "@/models/dto/quote-update-input";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class QuoteService extends BaseService {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async createQuote(
    context: TenantContext & { permissions: string[] },
    input: QuoteCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create quotes inside your company.");
    }

    const customer = await this.customerRepository.findById(input.companyId, input.customerId);

    if (!customer) {
      throw new Error("Customer not found.");
    }

    const pricing = calculateQuotePricing(input.items, input.discountAmount ?? 0);
    const count = await this.quoteRepository.countByCompany(input.companyId);

    return this.quoteRepository.create({
      companyId: input.companyId,
      customerId: input.customerId,
      code: generateQuoteCode(count + 1),
      issueDate: new Date(),
      validUntil: parseOptionalDate(input.validUntil),
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      notes: input.notes,
      createdByUserId: tenantContext.userId,
      items: pricing.items,
    });
  }

  async listQuotes(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only list quotes inside your company.");
    }

    return this.quoteRepository.listByCompany(companyId, search?.trim() || undefined);
  }

  async getQuote(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    quoteId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view quotes inside your company.");
    }

    const quote = await this.quoteRepository.findById(companyId, quoteId);

    if (!quote) {
      throw new Error("Quote not found.");
    }

    return quote;
  }

  async updateQuote(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    quoteId: string,
    input: QuoteUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update quotes inside your company.");
    }

    const existingQuote = await this.quoteRepository.findById(companyId, quoteId);

    if (!existingQuote) {
      throw new Error("Quote not found.");
    }

    if (existingQuote.status === QuoteStatus.APPROVED) {
      throw new Error("Approved quotes cannot be edited.");
    }

    const pricing = calculateQuotePricing(input.items, input.discountAmount ?? 0);

    return this.quoteRepository.update(companyId, quoteId, {
      validUntil: parseOptionalDate(input.validUntil),
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      notes: input.notes,
      items: pricing.items,
    });
  }

  async approveQuote(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    quoteId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesApprove);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only approve quotes inside your company.");
    }

    const existingQuote = await this.quoteRepository.findById(companyId, quoteId);

    if (!existingQuote) {
      throw new Error("Quote not found.");
    }

    return this.quoteRepository.updateStatus(
      companyId,
      quoteId,
      "APPROVED",
      tenantContext.userId,
    );
  }

  async deleteQuote(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    quoteId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesDelete);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only delete quotes inside your company.");
    }

    const existingQuote = await this.quoteRepository.findById(companyId, quoteId);

    if (!existingQuote) {
      throw new Error("Quote not found.");
    }

    if (existingQuote.status === QuoteStatus.APPROVED) {
      throw new Error("Approved quotes cannot be deleted.");
    }

    await this.quoteRepository.delete(companyId, quoteId);
  }
}

function calculateQuotePricing(
  items: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>,
  discountAmount: number,
) {
  const normalizedItems = items.map((item) => {
    const totalPrice = roundCurrency(item.quantity * item.unitPrice);

    return {
      productId: item.productId,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: roundCurrency(item.unitPrice),
      totalPrice,
    };
  });

  const subtotal = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0),
  );
  const normalizedDiscount = roundCurrency(discountAmount);

  if (normalizedDiscount > subtotal) {
    throw new Error("Discount cannot be greater than subtotal.");
  }

  const totalAmount = roundCurrency(subtotal - normalizedDiscount);

  return {
    items: normalizedItems,
    subtotal,
    discountAmount: normalizedDiscount,
    totalAmount,
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function generateQuoteCode(sequence: number) {
  return `ORC-${String(sequence).padStart(6, "0")}`;
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid validity date.");
  }

  return parsedDate;
}
