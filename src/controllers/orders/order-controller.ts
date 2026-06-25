import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { OrderCreateInputDto } from "@/models/dto/order-create-input";
import type { OrderDetailDto } from "@/models/dto/order-detail";
import type { OrderListItemDto } from "@/models/dto/order-list-item";
import type { OrderStatusUpdateInputDto } from "@/models/dto/order-status-update-input";
import type { OrderUpdateInputDto } from "@/models/dto/order-update-input";
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "@/models/validators/order-validator";
import { OrderService } from "@/services/orders/order-service";

type OrderContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class OrderController extends BaseController {
  constructor(private readonly orderService: OrderService) {
    super();
  }

  async create(
    context: OrderContext,
    input: OrderCreateInputDto,
  ): Promise<ControllerResult<OrderDetailDto>> {
    try {
      const payload = createOrderSchema.parse(input);
      const order = await this.orderService.createOrder(context, payload);
      return this.ok(mapOrderDetail(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async list(
    context: OrderContext,
    companyId: string,
    search?: string,
  ): Promise<ControllerResult<OrderListItemDto[]>> {
    try {
      const orders = await this.orderService.listOrders(context, companyId, search);
      return this.ok(
        orders.map((order) => ({
          id: order.id,
          code: order.code,
          status: order.status,
          productionStatus: order.productionStatus,
          customerId: order.customerId,
          customerName: order.customer.name,
          quoteId: order.quoteId,
          hasLinkedSale: hasLinkedSale(order),
          linkedSaleEntryId: findLinkedSaleEntryId(order),
          readyForSale: isReadyForSale(order),
          totalAmount: toNumber(order.totalAmount),
          deliveryDate: order.deliveryDate?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async show(
    context: OrderContext,
    companyId: string,
    orderId: string,
  ): Promise<ControllerResult<OrderDetailDto>> {
    try {
      const order = await this.orderService.getOrder(context, companyId, orderId);
      return this.ok(mapOrderDetail(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async update(
    context: OrderContext,
    companyId: string,
    orderId: string,
    input: OrderUpdateInputDto,
  ): Promise<ControllerResult<OrderDetailDto>> {
    try {
      const payload = updateOrderSchema.parse(input);
      const order = await this.orderService.updateOrder(context, companyId, orderId, payload);
      return this.ok(mapOrderDetail(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateStatuses(
    context: OrderContext,
    companyId: string,
    orderId: string,
    input: OrderStatusUpdateInputDto,
  ): Promise<ControllerResult<OrderDetailDto>> {
    try {
      const payload = updateOrderStatusSchema.parse(input);
      const order = await this.orderService.updateStatuses(context, companyId, orderId, payload);
      return this.ok(mapOrderDetail(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapOrderDetail(order: {
  id: string;
  companyId: string;
  customerId: string;
  customer: {
    name: string;
  };
  quoteId: string | null;
  code: string;
  status: string;
  productionStatus: string;
  deliveryDate: Date | null;
  totalAmount: { toNumber(): number } | number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  financials?: Array<{
    id: string;
    entryType: string;
    status: string;
  }>;
  items: Array<{
    id: string;
    productId: string | null;
    description: string;
    quantity: { toNumber(): number } | number;
    unitPrice: { toNumber(): number } | number;
    totalPrice: { toNumber(): number } | number;
  }>;
}): OrderDetailDto {
  return {
    id: order.id,
    companyId: order.companyId,
    customerId: order.customerId,
    customerName: order.customer.name,
    quoteId: order.quoteId,
    code: order.code,
    status: order.status,
    productionStatus: order.productionStatus,
    hasLinkedSale: hasLinkedSale(order),
    linkedSaleEntryId: findLinkedSaleEntryId(order),
    readyForSale: isReadyForSale(order),
    deliveryDate: order.deliveryDate?.toISOString() ?? null,
    totalAmount: toNumber(order.totalAmount),
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function hasLinkedSale(order: {
  financials?: Array<{
    id: string;
    entryType: string;
    status: string;
  }>;
}) {
  return order.financials?.some(
    (entry) =>
      (entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE") &&
      entry.status !== "CANCELED",
  ) ?? false;
}

function findLinkedSaleEntryId(order: {
  financials?: Array<{
    id: string;
    entryType: string;
    status: string;
  }>;
}) {
  return (
    order.financials?.find(
      (entry) =>
        (entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE") &&
        entry.status !== "CANCELED",
    )?.id ?? null
  );
}

function isReadyForSale(order: {
  status: string;
  productionStatus: string;
}) {
  return (
    order.status !== "CANCELED" &&
    (order.productionStatus === "READY" ||
      order.productionStatus === "DELIVERED" ||
      order.status === "COMPLETED")
  );
}
