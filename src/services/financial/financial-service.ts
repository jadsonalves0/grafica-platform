import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { FinancialAccountCreateInputDto } from "@/models/dto/financial-account-create-input";
import type { FinancialAccountUpdateInputDto } from "@/models/dto/financial-account-update-input";
import type { FinancialCategoryCreateInputDto } from "@/models/dto/financial-category-create-input";
import type { FinancialCategoryUpdateInputDto } from "@/models/dto/financial-category-update-input";
import type { FinancialEntryCreateInputDto } from "@/models/dto/financial-entry-create-input";
import type { FinancialEntryStatusInputDto } from "@/models/dto/financial-entry-status-input";
import type { FinancialEntryUpdateInputDto } from "@/models/dto/financial-entry-update-input";
import type { FinancialEntryStatus } from "@prisma/client";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { FinancialRepository } from "@/repositories/financial/financial-repository";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { OrderRepository } from "@/repositories/orders/order-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class FinancialService extends BaseService {
  constructor(
    private readonly financialRepository: FinancialRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly orderRepository: OrderRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async createAccount(context: TenantContext & { permissions: string[] }, input: FinancialAccountCreateInputDto) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create accounts inside your company.");
    }

    return this.financialRepository.createAccount({
      ...input,
      initialBalance: roundCurrency(input.initialBalance ?? 0),
    });
  }

  async listAccounts(context: TenantContext & { permissions: string[] }, companyId: string) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view accounts inside your company.");
    }

    return this.financialRepository.listAccounts(companyId);
  }

  async getAccount(context: TenantContext & { permissions: string[] }, companyId: string, accountId: string) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view accounts inside your company.");
    }

    const account = await this.financialRepository.findAccountById(companyId, accountId);

    if (!account) {
      throw new Error("Financial account not found.");
    }

    return account;
  }

  async updateAccount(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    accountId: string,
    input: FinancialAccountUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update accounts inside your company.");
    }

    const account = await this.financialRepository.findAccountById(companyId, accountId);

    if (!account) {
      throw new Error("Financial account not found.");
    }

    return this.financialRepository.updateAccount(accountId, {
      name: input.name,
      type: input.type,
      initialBalance: roundCurrency(input.initialBalance ?? 0),
    });
  }

  async createCategory(context: TenantContext & { permissions: string[] }, input: FinancialCategoryCreateInputDto) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create categories inside your company.");
    }

    const existingCategory = await this.financialRepository.findCategoryByName(
      input.companyId,
      input.type,
      input.name.trim(),
    );

    if (existingCategory) {
      throw new Error("A category with this name already exists for this entry type.");
    }

    return this.financialRepository.createCategory({
      companyId: input.companyId,
      name: input.name.trim(),
      type: input.type,
    });
  }

  async listCategories(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    type?: "INCOME" | "EXPENSE",
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view categories inside your company.");
    }

    return this.financialRepository.listCategories(companyId, type);
  }

  async getCategory(context: TenantContext & { permissions: string[] }, companyId: string, categoryId: string) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view categories inside your company.");
    }

    const category = await this.financialRepository.findCategoryById(companyId, categoryId);

    if (!category) {
      throw new Error("Financial category not found.");
    }

    return category;
  }

  async updateCategory(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    categoryId: string,
    input: FinancialCategoryUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update categories inside your company.");
    }

    const existingCategory = await this.financialRepository.findCategoryById(companyId, categoryId);

    if (!existingCategory) {
      throw new Error("Financial category not found.");
    }

    const duplicatedCategory = await this.financialRepository.findCategoryByNameExcludingId(
      companyId,
      input.type,
      input.name.trim(),
      categoryId,
    );

    if (duplicatedCategory) {
      throw new Error("A category with this name already exists for this entry type.");
    }

    return this.financialRepository.updateCategory(categoryId, {
      name: input.name.trim(),
      type: input.type,
      isActive: input.isActive,
    });
  }

  async createEntry(context: TenantContext & { permissions: string[] }, input: FinancialEntryCreateInputDto) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create financial entries inside your company.");
    }

    const normalized = await this.prepareEntryPayload(input.companyId, input);

    return this.financialRepository.createEntry({
      companyId: input.companyId,
      accountId: normalized.accountId,
      financialCategoryId: normalized.financialCategoryId,
      customerId: normalized.customerId,
      orderId: normalized.orderId,
      quoteId: normalized.quoteId,
      entryType: normalized.entryType,
      category: normalized.category,
      description: normalized.description,
      amount: normalized.amount,
      dueDate: normalized.dueDate,
      status: normalized.status,
      paidAt: normalized.paidAt,
      createdByUserId: tenantContext.userId,
      items: normalized.items,
    });
  }

  async listEntries(context: TenantContext & { permissions: string[] }, companyId: string, status?: FinancialEntryStatus) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view financial entries inside your company.");
    }

    return this.financialRepository.listEntries(companyId, status);
  }

  async getEntry(context: TenantContext & { permissions: string[] }, companyId: string, entryId: string) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view financial entries inside your company.");
    }

    const entry = await this.financialRepository.findEntryById(companyId, entryId);

    if (!entry) {
      throw new Error("Financial entry not found.");
    }

    return entry;
  }

  async updateEntry(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    input: FinancialEntryUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update financial entries inside your company.");
    }

    const existingEntry = await this.financialRepository.findEntryById(companyId, entryId);

    if (!existingEntry) {
      throw new Error("Financial entry not found.");
    }

    const normalized = await this.prepareEntryPayload(companyId, input);

    return this.financialRepository.updateEntry(entryId, {
      accountId: normalized.accountId,
      financialCategoryId: normalized.financialCategoryId,
      customerId: normalized.customerId,
      orderId: normalized.orderId,
      quoteId: normalized.quoteId,
      entryType: normalized.entryType,
      category: normalized.category,
      description: normalized.description,
      amount: normalized.amount,
      dueDate: normalized.dueDate,
      status: normalized.status,
      paidAt: normalized.paidAt,
      items: normalized.items,
    });
  }

  async updateEntryStatus(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    entryId: string,
    input: FinancialEntryStatusInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialManage);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update financial entries inside your company.");
    }

    const entry = await this.financialRepository.findEntryById(companyId, entryId);

    if (!entry) {
      throw new Error("Financial entry not found.");
    }

    return this.financialRepository.updateEntryStatus(entryId, {
      status: input.status,
      paidAt: input.status === "PAID" ? parseOptionalDate(input.paidAt) ?? new Date() : null,
    });
  }

  async getCashFlowSummary(context: TenantContext & { permissions: string[] }, companyId: string) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.financialView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view cash flow inside your company.");
    }

    const [accounts, entries] = await Promise.all([
      this.financialRepository.listAccounts(companyId),
      this.financialRepository.listEntries(companyId),
    ]);

    const initialBalance = accounts.reduce((sum, account) => sum + toNumber(account.initialBalance), 0);

    const summary = entries.reduce(
      (acc, entry) => {
        const amount = toNumber(entry.amount);

        const behavesAsIncome = entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE";
        const behavesAsExpense = entry.entryType === "EXPENSE" || entry.entryType === "PAYABLE";

        if (behavesAsIncome && entry.status === "PAID") acc.paidIncome += amount;
        if (behavesAsExpense && entry.status === "PAID") acc.paidExpense += amount;
        if (behavesAsIncome && entry.status === "PENDING") acc.pendingIncome += amount;
        if (behavesAsExpense && entry.status === "PENDING") acc.pendingExpense += amount;
        if (behavesAsExpense && entry.status === "OVERDUE") acc.overdueExpense += amount;
        if (behavesAsIncome && entry.status === "OVERDUE") acc.overdueIncome += amount;

        return acc;
      },
      {
        pendingIncome: 0,
        pendingExpense: 0,
        paidIncome: 0,
        paidExpense: 0,
        overdueIncome: 0,
        overdueExpense: 0,
      },
    );

    return {
      ...summary,
      projectedBalance: roundCurrency(
        initialBalance +
          summary.paidIncome -
          summary.paidExpense +
          summary.pendingIncome -
          summary.pendingExpense +
          summary.overdueIncome -
          summary.overdueExpense,
      ),
    };
  }

  private async prepareEntryPayload(
    companyId: string,
    input: Omit<FinancialEntryCreateInputDto, "companyId"> | FinancialEntryCreateInputDto,
  ) {
    const account = await this.financialRepository.findAccountById(companyId, input.accountId);

    if (!account) {
      throw new Error("Financial account not found.");
    }

    let customerName: string | undefined;
    if (input.customerId) {
      const customer = await this.customerRepository.findById(companyId, input.customerId);
      if (!customer) {
        throw new Error("Customer not found.");
      }
      customerName = customer.name;
    }

    if (input.orderId) {
      const order = await this.orderRepository.findById(companyId, input.orderId);
      if (!order) {
        throw new Error("Order not found.");
      }
    }

    if (input.quoteId) {
      const quote = await this.quoteRepository.findById(companyId, input.quoteId);
      if (!quote) {
        throw new Error("Quote not found.");
      }
    }

    let categoryName = input.category.trim();
    let categoryId = input.financialCategoryId;

    if (categoryId) {
      const category = await this.financialRepository.findCategoryById(companyId, categoryId);

      if (!category) {
        throw new Error("Financial category not found.");
      }

      if (category.type !== input.entryType) {
        throw new Error("The selected category does not match the type of entry.");
      }

      if (!category.isActive) {
        throw new Error("The selected category is inactive.");
      }

      categoryName = category.name;
    }

    const items = await this.normalizeEntryItems(companyId, input.items);
    const amount = items.length
      ? roundCurrency(items.reduce((sum, item) => sum + item.totalPrice, 0))
      : roundCurrency(input.amount);

    return {
      accountId: input.accountId,
      financialCategoryId: categoryId,
      customerId: input.customerId,
      orderId: input.orderId,
      quoteId: input.quoteId,
      entryType: input.entryType,
      category: categoryName,
      description: buildEntryDescription({
        inputDescription: input.description?.trim(),
        entryType: input.entryType,
        categoryName,
        customerName,
        itemDescriptions: items.map((item) => item.description),
      }),
      amount,
      dueDate: parseRequiredDate(input.dueDate),
      status: input.status,
      paidAt:
        input.status === "PAID"
          ? parseOptionalDate(input.paidAt) ?? new Date()
          : null,
      items,
    };
  }

  private async normalizeEntryItems(
    companyId: string,
    items?: FinancialEntryCreateInputDto["items"] | FinancialEntryUpdateInputDto["items"],
  ) {
    if (!items?.length) {
      return [];
    }

    const normalizedItems = [];

    for (const item of items) {
      if (item.productId) {
        const product = await this.inventoryRepository.findProductById(companyId, item.productId);

        if (!product) {
          throw new Error("Product linked to the financial entry was not found.");
        }

        const fallbackDescription = item.description.trim() || product.name;
        const quantity = roundQuantity(item.quantity);
        const unitPrice = roundCurrency(item.unitPrice);

        normalizedItems.push({
          productId: item.productId,
          description: fallbackDescription,
          quantity,
          unitPrice,
          totalPrice: roundCurrency(quantity * unitPrice),
        });

        continue;
      }

      const quantity = roundQuantity(item.quantity);
      const unitPrice = roundCurrency(item.unitPrice);

      normalizedItems.push({
        productId: item.productId,
        description: item.description.trim(),
        quantity,
        unitPrice,
        totalPrice: roundCurrency(quantity * unitPrice),
      });
    }

    return normalizedItems;
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function parseRequiredDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid due date.");
  }

  return parsedDate;
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid payment date.");
  }

  return parsedDate;
}

function buildEntryDescription(input: {
  inputDescription?: string;
  entryType: "INCOME" | "EXPENSE";
  categoryName: string;
  customerName?: string;
  itemDescriptions: string[];
}) {
  if (input.inputDescription) {
    return input.inputDescription;
  }

  if (input.itemDescriptions.length) {
    const firstItems = input.itemDescriptions.slice(0, 2).join(", ");
    const suffix =
      input.itemDescriptions.length > 2 ? ` e mais ${input.itemDescriptions.length - 2} item(ns)` : "";
    const customerLabel = input.customerName ? ` para ${input.customerName}` : "";
    return `Venda${customerLabel}: ${firstItems}${suffix}`;
  }

  if (input.customerName) {
    return `${input.entryType === "INCOME" ? "Receita" : "Despesa"} de ${input.categoryName} para ${input.customerName}`;
  }

  return `${input.entryType === "INCOME" ? "Receita" : "Despesa"} de ${input.categoryName}`;
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
