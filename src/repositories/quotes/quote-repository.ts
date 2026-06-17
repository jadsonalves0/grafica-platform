import type { PrismaClient, Quote } from "@prisma/client";

export class QuoteRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    companyId: string;
    customerId: string;
    code: string;
    issueDate: Date;
    validUntil?: Date;
    subtotal: number;
    discountAmount: number;
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
    return this.db.quote.create({
      data: {
        companyId: input.companyId,
        customerId: input.customerId,
        code: input.code,
        issueDate: input.issueDate,
        validUntil: input.validUntil,
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
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
        items: true,
        customer: true,
      },
    });
  }

  async listByCompany(companyId: string, search?: string) {
    return this.db.quote.findMany({
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

  async findById(companyId: string, quoteId: string) {
    return this.db.quote.findFirst({
      where: {
        id: quoteId,
        companyId,
      },
      include: {
        items: true,
        customer: true,
      },
    });
  }

  async update(
    companyId: string,
    quoteId: string,
    input: {
      validUntil?: Date;
      subtotal: number;
      discountAmount: number;
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
      await tx.quoteItem.deleteMany({
        where: {
          quoteId,
          companyId,
        },
      });

      return tx.quote.update({
        where: { id: quoteId },
        data: {
          validUntil: input.validUntil,
          subtotal: input.subtotal,
          discountAmount: input.discountAmount,
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
          items: true,
          customer: true,
        },
      });
    });
  }

  async updateStatus(
    companyId: string,
    quoteId: string,
    status: "APPROVED" | "REJECTED" | "SENT" | "DRAFT",
    approvedByUserId?: string,
  ) {
    return this.db.quote.update({
      where: {
        id: quoteId,
      },
      data: {
        status,
        approvedByUserId: approvedByUserId ?? null,
      },
      include: {
        items: true,
        customer: true,
      },
    });
  }

  async delete(companyId: string, quoteId: string) {
    return this.db.quote.delete({
      where: {
        id: quoteId,
      },
    });
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.db.quote.count({
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
