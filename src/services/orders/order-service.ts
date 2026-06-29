import { OrderStatus, QuoteStatus } from "@prisma/client";

import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { OrderBillingInputDto } from "@/models/dto/order-billing-input";
import type { OrderCreateInputDto } from "@/models/dto/order-create-input";
import type { OrderStatusUpdateInputDto } from "@/models/dto/order-status-update-input";
import type { OrderUpdateInputDto } from "@/models/dto/order-update-input";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { FinancialRepository } from "@/repositories/financial/financial-repository";
import { OrderRepository } from "@/repositories/orders/order-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";
import { FinancialService } from "@/services/financial/financial-service";

export class OrderService extends BaseService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly financialRepository: FinancialRepository,
    private readonly financialService: FinancialService,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async createOrder(
    context: TenantContext & { permissions: string[] },
    input: OrderCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.ordersCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create orders inside your company.");
    }

    const count = await this.orderRepository.countByCompany(input.companyId);
    const code = generateOrderCode(count + 1);

    if (input.quoteId) {
      const quote = await this.quoteRepository.findById(input.companyId, input.quoteId);

      if (!quote) {
        throw new Error("Quote not found.");
      }

      if (quote.status !== QuoteStatus.APPROVED) {
        throw new Error("Only approved quotes can be converted into orders.");
      }

      return this.orderRepository.create({
        companyId: input.companyId,
        customerId: quote.customerId,
        quoteId: quote.id,
        code,
        deliveryDate: parseOptionalDate(input.deliveryDate),
        totalAmount: toNumber(quote.totalAmount),
        notes: input.notes ?? quote.notes ?? undefined,
        createdByUserId: tenantContext.userId,
        items: quote.items.map((item) => ({
          productId: item.productId ?? undefined,
          description: item.description,
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          totalPrice: toNumber(item.totalPrice),
        })),
      });
    }

    if (!input.customerId) {
      throw new Error("Customer is required for manual orders.");
    }

    if (!input.items || input.items.length === 0) {
      throw new Error("Manual orders require at least one item.");
    }

    const customer = await this.customerRepository.findById(input.companyId, input.customerId);

    if (!customer) {
      throw new Error("Customer not found.");
    }

    const pricing = calculateOrderPricing(input.items);

    return this.orderRepository.create({
      companyId: input.companyId,
      customerId: input.customerId,
      code,
      deliveryDate: parseOptionalDate(input.deliveryDate),
      totalAmount: pricing.totalAmount,
      notes: input.notes,
      createdByUserId: tenantContext.userId,
      items: pricing.items,
    });
  }

  async listOrders(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    search?: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.ordersView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only list orders inside your company.");
    }

    return this.orderRepository.listByCompany(companyId, search?.trim() || undefined);
  }

  async getOrder(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    orderId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.ordersView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view orders inside your company.");
    }

    const order = await this.orderRepository.findById(companyId, orderId);

    if (!order) {
      throw new Error("Order not found.");
    }

    return order;
  }

  async updateOrder(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    orderId: string,
    input: OrderUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.ordersUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update orders inside your company.");
    }

    const existingOrder = await this.orderRepository.findById(companyId, orderId);

    if (!existingOrder) {
      throw new Error("Order not found.");
    }

    if (existingOrder.status === OrderStatus.COMPLETED) {
      throw new Error("Completed orders cannot be edited.");
    }

    const pricing = calculateOrderPricing(input.items);

    return this.orderRepository.update(companyId, orderId, {
      deliveryDate: parseOptionalDate(input.deliveryDate),
      totalAmount: pricing.totalAmount,
      notes: input.notes,
      items: pricing.items,
    });
  }

  async updateStatuses(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    orderId: string,
    input: OrderStatusUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.ordersManageStatus,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only manage orders inside your company.");
    }

    const existingOrder = await this.orderRepository.findById(companyId, orderId);

    if (!existingOrder) {
      throw new Error("Order not found.");
    }

    return this.orderRepository.updateStatuses(orderId, input);
  }

  async billOrder(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    orderId: string,
    input: OrderBillingInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.ordersManageStatus,
    );
    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.financialManage,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only bill orders inside your company.");
    }

    const order = await this.orderRepository.findById(companyId, orderId);

    if (!order) {
      throw new Error("Order not found.");
    }

    if (order.status === OrderStatus.CANCELED) {
      throw new Error("Canceled orders cannot be billed.");
    }

    if (!isReadyForBilling(order)) {
      throw new Error("Only delivered or completed orders can be billed.");
    }

    const existingSale = await this.financialRepository.findActiveSaleByOrderId(
      companyId,
      orderId,
    );

    if (existingSale) {
      const updatedOrder = await this.orderRepository.findById(companyId, orderId);

      if (!updatedOrder) {
        throw new Error("Order not found after checking billing.");
      }

      return {
        order: updatedOrder,
        message:
          existingSale.status === "PAID"
            ? "Este pedido ja estava faturado e recebido."
            : "Este pedido ja estava faturado e segue no financeiro para recebimento.",
      };
    }

    if (!order.items.length) {
      throw new Error("Orders without items cannot be billed.");
    }

    const accountId = input.accountId ?? (await this.resolveDefaultAccountId(companyId));
    const financialCategoryId =
      input.financialCategoryId ?? (await this.resolveDefaultIncomeCategoryId(companyId));
    const dueDate = resolveBillingDate(order.deliveryDate, input.dueDate);
    const paymentStatus = input.paymentStatus ?? "PENDING";

    await this.financialService.createEntry(context, {
      companyId,
      accountId,
      financialCategoryId,
      customerId: order.customerId,
      orderId: order.id,
      quoteId: order.quoteId ?? undefined,
      entryType: "INCOME",
      category: "Venda",
      description: input.description?.trim() || `Faturamento do pedido ${order.code}`,
      amount: toNumber(order.totalAmount),
      dueDate,
      status: paymentStatus,
      paidAt: paymentStatus === "PAID" ? dueDate : undefined,
      items: order.items.map((item) => ({
        productId: item.productId ?? undefined,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
      })),
    });

    if (order.status !== OrderStatus.COMPLETED) {
      await this.orderRepository.updateStatuses(order.id, {
        status: "COMPLETED",
      });
    }

    const updatedOrder = await this.orderRepository.findById(companyId, orderId);

    if (!updatedOrder) {
      throw new Error("Order not found after billing.");
    }

    return {
      order: updatedOrder,
      message:
        paymentStatus === "PAID"
          ? "Pedido faturado e recebido no ato com sucesso."
          : "Pedido faturado com sucesso. A venda ficou pendente no contas a receber.",
    };
  }

  private async resolveDefaultAccountId(companyId: string) {
    const accounts = await this.financialRepository.listAccounts(companyId);
    const activeAccounts = accounts.filter((account) => account.isActive);
    const preferredAccount =
      activeAccounts.find((account) => account.type === "CASH") ??
      activeAccounts[0] ??
      accounts.find((account) => account.type === "CASH") ??
      accounts[0];

    if (!preferredAccount) {
      throw new Error(
        "Cadastre uma conta financeira antes de faturar pedidos.",
      );
    }

    return preferredAccount.id;
  }

  private async resolveDefaultIncomeCategoryId(companyId: string) {
    const categories = await this.financialRepository.listCategories(companyId, "INCOME");
    const preferredCategory = categories.find((category) => category.isActive) ?? categories[0];

    if (!preferredCategory) {
      throw new Error(
        "Cadastre uma categoria financeira de receita antes de faturar pedidos.",
      );
    }

    return preferredCategory.id;
  }
}

function calculateOrderPricing(
  items: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>,
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

  const totalAmount = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0),
  );

  return {
    items: normalizedItems,
    totalAmount,
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function generateOrderCode(sequence: number) {
  return `PED-${String(sequence).padStart(6, "0")}`;
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid delivery date.");
  }

  return parsedDate;
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function resolveBillingDate(orderDeliveryDate: Date | null, inputDueDate?: string) {
  if (inputDueDate) {
    return inputDueDate;
  }

  if (orderDeliveryDate) {
    return orderDeliveryDate.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function isReadyForBilling(order: {
  status: OrderStatus;
  productionStatus:
    | "PENDING"
    | "IN_PRODUCTION"
    | "WAITING_APPROVAL"
    | "READY"
    | "DELIVERED";
}) {
  return (
    order.status !== OrderStatus.CANCELED &&
    (order.productionStatus === "DELIVERED" || order.status === OrderStatus.COMPLETED)
  );
}
