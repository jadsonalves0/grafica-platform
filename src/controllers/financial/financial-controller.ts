import type { FinancialEntryStatus } from "@prisma/client";

import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { CashFlowSummaryDto } from "@/models/dto/cash-flow-summary";
import type { FinancialAccountCreateInputDto } from "@/models/dto/financial-account-create-input";
import type { FinancialAccountDetailDto } from "@/models/dto/financial-account-detail";
import type { FinancialAccountListItemDto } from "@/models/dto/financial-account-list-item";
import type { FinancialAccountUpdateInputDto } from "@/models/dto/financial-account-update-input";
import type { FinancialCategoryCreateInputDto } from "@/models/dto/financial-category-create-input";
import type { FinancialCategoryListItemDto } from "@/models/dto/financial-category-list-item";
import type { FinancialCategoryUpdateInputDto } from "@/models/dto/financial-category-update-input";
import type { FinancialEntryCreateInputDto } from "@/models/dto/financial-entry-create-input";
import type { FinancialEntryDetailDto } from "@/models/dto/financial-entry-detail";
import type { FinancialEntryListItemDto } from "@/models/dto/financial-entry-list-item";
import type { FinancialEntryStatusInputDto } from "@/models/dto/financial-entry-status-input";
import type { FinancialEntryUpdateInputDto } from "@/models/dto/financial-entry-update-input";
import {
  createFinancialAccountSchema,
  createFinancialCategorySchema,
  createFinancialEntrySchema,
  updateFinancialAccountSchema,
  updateFinancialCategorySchema,
  updateFinancialEntrySchema,
  updateFinancialEntryStatusSchema,
} from "@/models/validators/financial-validator";
import { FinancialService } from "@/services/financial/financial-service";

type FinancialContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class FinancialController extends BaseController {
  constructor(private readonly financialService: FinancialService) {
    super();
  }

  async createAccount(
    context: FinancialContext,
    input: FinancialAccountCreateInputDto,
  ): Promise<ControllerResult<FinancialAccountListItemDto>> {
    try {
      const payload = createFinancialAccountSchema.parse(input);
      const account = await this.financialService.createAccount(context, payload);
      return this.ok(mapAccount(account));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async listAccounts(context: FinancialContext, companyId: string): Promise<ControllerResult<FinancialAccountListItemDto[]>> {
    try {
      const accounts = await this.financialService.listAccounts(context, companyId);
      return this.ok(accounts.map(mapAccount));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async showAccount(
    context: FinancialContext,
    companyId: string,
    accountId: string,
  ): Promise<ControllerResult<FinancialAccountDetailDto>> {
    try {
      const account = await this.financialService.getAccount(context, companyId, accountId);
      return this.ok({
        id: account.id,
        companyId: account.companyId,
        name: account.name,
        type: account.type,
        initialBalance: toNumber(account.initialBalance),
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
      });
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async updateAccount(
    context: FinancialContext,
    companyId: string,
    accountId: string,
    input: FinancialAccountUpdateInputDto,
  ): Promise<ControllerResult<FinancialAccountDetailDto>> {
    try {
      const payload = updateFinancialAccountSchema.parse(input);
      const account = await this.financialService.updateAccount(context, companyId, accountId, payload);
      return this.ok({
        id: account.id,
        companyId: account.companyId,
        name: account.name,
        type: account.type,
        initialBalance: toNumber(account.initialBalance),
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
      });
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async createCategory(
    context: FinancialContext,
    input: FinancialCategoryCreateInputDto,
  ): Promise<ControllerResult<FinancialCategoryListItemDto>> {
    try {
      const payload = createFinancialCategorySchema.parse(input);
      const category = await this.financialService.createCategory(context, payload);
      return this.ok(mapCategory(category));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async listCategories(
    context: FinancialContext,
    companyId: string,
    type?: "INCOME" | "EXPENSE",
  ): Promise<ControllerResult<FinancialCategoryListItemDto[]>> {
    try {
      const categories = await this.financialService.listCategories(context, companyId, type);
      return this.ok(categories.map(mapCategory));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async showCategory(
    context: FinancialContext,
    companyId: string,
    categoryId: string,
  ): Promise<ControllerResult<FinancialCategoryListItemDto>> {
    try {
      const category = await this.financialService.getCategory(context, companyId, categoryId);
      return this.ok(mapCategory(category));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async updateCategory(
    context: FinancialContext,
    companyId: string,
    categoryId: string,
    input: FinancialCategoryUpdateInputDto,
  ): Promise<ControllerResult<FinancialCategoryListItemDto>> {
    try {
      const payload = updateFinancialCategorySchema.parse(input);
      const category = await this.financialService.updateCategory(context, companyId, categoryId, payload);
      return this.ok(mapCategory(category));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async createEntry(
    context: FinancialContext,
    input: FinancialEntryCreateInputDto,
  ): Promise<ControllerResult<FinancialEntryListItemDto>> {
    try {
      const payload = createFinancialEntrySchema.parse(input);
      const entry = await this.financialService.createEntry(context, payload);
      return this.ok(mapEntry(entry));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async listEntries(
    context: FinancialContext,
    companyId: string,
    status?: FinancialEntryStatus,
  ): Promise<ControllerResult<FinancialEntryListItemDto[]>> {
    try {
      const entries = await this.financialService.listEntries(context, companyId, status);
      return this.ok(entries.map(mapEntry));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async showEntry(
    context: FinancialContext,
    companyId: string,
    entryId: string,
  ): Promise<ControllerResult<FinancialEntryDetailDto>> {
    try {
      const entry = await this.financialService.getEntry(context, companyId, entryId);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async updateEntry(
    context: FinancialContext,
    companyId: string,
    entryId: string,
    input: FinancialEntryUpdateInputDto,
  ): Promise<ControllerResult<FinancialEntryDetailDto>> {
    try {
      const payload = updateFinancialEntrySchema.parse(input);
      const entry = await this.financialService.updateEntry(context, companyId, entryId, payload);
      return this.ok(mapEntryDetail(entry));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async updateEntryStatus(
    context: FinancialContext,
    companyId: string,
    entryId: string,
    input: FinancialEntryStatusInputDto,
  ): Promise<ControllerResult<FinancialEntryListItemDto>> {
    try {
      const payload = updateFinancialEntryStatusSchema.parse(input);
      const entry = await this.financialService.updateEntryStatus(context, companyId, entryId, payload);
      return this.ok(mapEntry(entry));
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }

  async cashFlowSummary(context: FinancialContext, companyId: string): Promise<ControllerResult<CashFlowSummaryDto>> {
    try {
      const summary = await this.financialService.getCashFlowSummary(context, companyId);
      return this.ok(summary);
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Unexpected error.");
    }
  }
}

function mapAccount(account: {
  id: string;
  name: string;
  type: string;
  initialBalance: { toNumber(): number } | number;
  isActive: boolean;
}): FinancialAccountListItemDto {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance: toNumber(account.initialBalance),
    isActive: account.isActive,
  };
}

function mapCategory(category: {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FinancialCategoryListItemDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function mapEntry(entry: {
  id: string;
  accountId: string;
  financialCategoryId: string | null;
  customerId: string | null;
  inventoryEntryId: string | null;
  orderId: string | null;
  quoteId: string | null;
  entryType: "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "TRANSFER";
  originType: "MANUAL" | "ENTRY" | "PRODUCTION" | "ORDER" | "QUOTE" | "WEBSITE";
  category: string;
  description: string;
  amount: { toNumber(): number } | number;
  dueDate: Date;
  status: string;
  paidAt: Date | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  account?: { name: string } | null;
  customer?: { name: string } | null;
  inventoryEntry?: { documentNumber: string } | null;
  order?: { code: string } | null;
  quote?: { code: string } | null;
  items?: Array<unknown>;
}): FinancialEntryListItemDto {
  const origin = buildOrigin(entry);

  return {
    id: entry.id,
    accountId: entry.accountId,
    accountName: entry.account?.name ?? "",
    financialCategoryId: entry.financialCategoryId,
    customerId: entry.customerId,
    customerName: entry.customer?.name ?? null,
    inventoryEntryId: entry.inventoryEntryId,
    inventoryEntryDocumentNumber: entry.inventoryEntry?.documentNumber ?? null,
    orderId: entry.orderId,
    orderCode: entry.order?.code ?? null,
    quoteId: entry.quoteId,
    quoteCode: entry.quote?.code ?? null,
    entryType: entry.entryType,
    originType: entry.originType,
    originLabel: origin.label,
    originHref: origin.href,
    category: entry.category,
    description: entry.description,
    amount: toNumber(entry.amount),
    dueDate: entry.dueDate.toISOString(),
    status: entry.status,
    paidAt: entry.paidAt?.toISOString() ?? null,
    installmentNumber: entry.installmentNumber,
    installmentCount: entry.installmentCount,
    itemCount: entry.items?.length ?? 0,
  };
}

function mapEntryDetail(entry: {
  id: string;
  accountId: string;
  financialCategoryId: string | null;
  customerId: string | null;
  inventoryEntryId: string | null;
  orderId: string | null;
  quoteId: string | null;
  entryType: "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "TRANSFER";
  originType: "MANUAL" | "ENTRY" | "PRODUCTION" | "ORDER" | "QUOTE" | "WEBSITE";
  category: string;
  description: string;
  amount: { toNumber(): number } | number;
  dueDate: Date;
  status: string;
  paidAt: Date | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  account?: { name: string } | null;
  customer?: { name: string } | null;
  inventoryEntry?: { documentNumber: string } | null;
  order?: { code: string } | null;
  quote?: { code: string } | null;
  items?: Array<{
    id: string;
    productId: string | null;
    description: string;
    quantity: { toNumber(): number } | number;
    unitPrice: { toNumber(): number } | number;
    totalPrice: { toNumber(): number } | number;
  }>;
}) {
  const origin = buildOrigin(entry);

  return {
    id: entry.id,
    accountId: entry.accountId,
    accountName: entry.account?.name ?? "",
    financialCategoryId: entry.financialCategoryId,
    customerId: entry.customerId,
    customerName: entry.customer?.name ?? null,
    inventoryEntryId: entry.inventoryEntryId,
    inventoryEntryDocumentNumber: entry.inventoryEntry?.documentNumber ?? null,
    orderId: entry.orderId,
    orderCode: entry.order?.code ?? null,
    quoteId: entry.quoteId,
    quoteCode: entry.quote?.code ?? null,
    entryType: entry.entryType,
    originType: entry.originType,
    originLabel: origin.label,
    originHref: origin.href,
    category: entry.category,
    description: entry.description,
    amount: toNumber(entry.amount),
    dueDate: entry.dueDate.toISOString(),
    status: entry.status,
    paidAt: entry.paidAt?.toISOString() ?? null,
    installmentNumber: entry.installmentNumber,
    installmentCount: entry.installmentCount,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    items:
      entry.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        totalPrice: toNumber(item.totalPrice),
      })) ?? [],
  };
}

function buildOrigin(entry: {
  id: string;
  originType: "MANUAL" | "ENTRY" | "PRODUCTION" | "ORDER" | "QUOTE" | "WEBSITE";
  inventoryEntryId?: string | null;
  inventoryEntry?: { documentNumber: string } | null;
  orderId?: string | null;
  order?: { code: string } | null;
  quoteId?: string | null;
  quote?: { code: string } | null;
  items?: Array<unknown>;
}) {
  if (entry.inventoryEntryId && entry.inventoryEntry?.documentNumber) {
    return {
      label: `Entrada #${entry.inventoryEntry.documentNumber}`,
      href: `/admin/estoque/entradas/${entry.inventoryEntryId}`,
    };
  }

  if (entry.orderId && entry.order?.code) {
    return {
      label: `Pedido ${entry.order.code}`,
      href: `/admin/pedidos/${entry.orderId}`,
    };
  }

  if (entry.quoteId && entry.quote?.code) {
    return {
      label: `Orcamento ${entry.quote.code}`,
      href: `/admin/orcamentos/${entry.quoteId}`,
    };
  }

  if (entry.items?.length) {
    return {
      label: `Venda #${entry.id.slice(0, 8)}`,
      href: `/admin/vendas/${entry.id}`,
    };
  }

  return {
    label: "Lancamento manual",
    href: null,
  };
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
