import type { PrismaClient } from "@prisma/client";

export class OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    companyId: string;
    customerId: string;
    quoteId?: string;
    code: string;
    deliveryDate?: Date;
    totalAmount: number;
    notes?: string;
    createdByUserId: string;
    items: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) {
    return this.db.order.create({
      data: {
        companyId: input.companyId,
        customerId: input.customerId,
        quoteId: input.quoteId,
        code: input.code,
        deliveryDate: input.deliveryDate,
        totalAmount: input.totalAmount,
        notes: normalizeEmpty(input.notes),
        createdByUserId: input.createdByUserId,
        items: {
          create: input.items.map((item) => ({
            companyId: input.companyId,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });
  }

  async listByCompany(companyId: string, search?: string) {
    return this.db.order.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(companyId: string, orderId: string) {
    return this.db.order.findFirst({
      where: {
        id: orderId,
        companyId,
      },
      include: {
        customer: true,
        items: true,
        quote: true,
      },
    });
  }

  async update(
    companyId: string,
    orderId: string,
    input: {
      deliveryDate?: Date;
      totalAmount: number;
      notes?: string;
      items: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: {
          orderId,
          companyId,
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: {
          deliveryDate: input.deliveryDate,
          totalAmount: input.totalAmount,
          notes: normalizeEmpty(input.notes),
          items: {
            create: input.items.map((item) => ({
              companyId,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });
    });
  }

  async updateStatuses(
    orderId: string,
    input: {
      status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
      productionStatus?:
        | "PENDING"
        | "IN_PRODUCTION"
        | "WAITING_APPROVAL"
        | "READY"
        | "DELIVERED";
    },
  ) {
    return this.db.order.update({
      where: { id: orderId },
      data: input,
      include: {
        customer: true,
        items: true,
      },
    });
  }

  async countByCompany(companyId: string) {
    return this.db.order.count({
      where: {
        companyId,
      },
    });
  }
}

function normalizeEmpty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
