import type { FinancialEntryStatus, Prisma, PrismaClient } from "@prisma/client";

import { registerOutputStockByFifo, toNumber } from "@/repositories/inventory/stock-ledger";

export class FinancialRepository {
  constructor(private readonly db: PrismaClient) {}

  async createAccount(input: {
    companyId: string;
    name: string;
    type: "CASH" | "BANK" | "DIGITAL_WALLET";
    initialBalance: number;
  }) {
    return this.db.financialAccount.create({
      data: input,
    });
  }

  async listAccounts(companyId: string) {
    return this.db.financialAccount.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }

  async updateAccount(
    accountId: string,
    input: {
      name: string;
      type: "CASH" | "BANK" | "DIGITAL_WALLET";
      initialBalance: number;
    },
  ) {
    return this.db.financialAccount.update({
      where: { id: accountId },
      data: input,
    });
  }

  async findAccountById(companyId: string, accountId: string) {
    return this.db.financialAccount.findFirst({
      where: {
        id: accountId,
        companyId,
      },
    });
  }

  async createCategory(input: {
    companyId: string;
    name: string;
    type: "INCOME" | "EXPENSE";
  }) {
    return this.db.financialCategory.create({
      data: input,
    });
  }

  async listCategories(companyId: string, type?: "INCOME" | "EXPENSE") {
    return this.db.financialCategory.findMany({
      where: {
        companyId,
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async findCategoryById(companyId: string, categoryId: string) {
    return this.db.financialCategory.findFirst({
      where: {
        id: categoryId,
        companyId,
      },
    });
  }

  async findCategoryByName(companyId: string, type: "INCOME" | "EXPENSE", name: string) {
    return this.db.financialCategory.findFirst({
      where: {
        companyId,
        type,
        name,
      },
    });
  }

  async findCategoryByNameExcludingId(
    companyId: string,
    type: "INCOME" | "EXPENSE",
    name: string,
    categoryId: string,
  ) {
    return this.db.financialCategory.findFirst({
      where: {
        companyId,
        type,
        name,
        id: {
          not: categoryId,
        },
      },
    });
  }

  async updateCategory(
    categoryId: string,
    input: {
      name: string;
      type: "INCOME" | "EXPENSE";
      isActive: boolean;
    },
  ) {
    return this.db.financialCategory.update({
      where: { id: categoryId },
      data: input,
    });
  }

  async createEntry(input: {
    companyId: string;
    accountId: string;
    financialCategoryId?: string;
    customerId?: string;
    orderId?: string;
    quoteId?: string;
    entryType: "INCOME" | "EXPENSE";
    category: string;
    description: string;
    amount: number;
    dueDate: Date;
    status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
    paidAt?: Date | null;
    createdByUserId: string;
    items?: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) {
    return this.db.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({
        data: {
          companyId: input.companyId,
          accountId: input.accountId,
          financialCategoryId: input.financialCategoryId,
          customerId: input.customerId,
          orderId: input.orderId,
          quoteId: input.quoteId,
          entryType: input.entryType,
          category: input.category,
          description: input.description,
          amount: input.amount,
          dueDate: input.dueDate,
          status: input.status,
          paidAt: input.paidAt,
          createdByUserId: input.createdByUserId,
          items: input.items?.length
            ? {
                create: input.items.map((item) => ({
                  productId: item.productId,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                })),
              }
            : undefined,
        },
        include: financialEntryInclude,
      });

      await synchronizeSaleStock(tx, {
        companyId: input.companyId,
        entry,
        actorUserId: input.createdByUserId,
      });

      return tx.financialEntry.findUniqueOrThrow({
        where: { id: entry.id },
        include: financialEntryInclude,
      });
    });
  }

  async listEntries(companyId: string, status?: FinancialEntryStatus) {
    return this.db.financialEntry.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
      },
      include: financialEntryInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
  }

  async findEntryById(companyId: string, entryId: string) {
    return this.db.financialEntry.findFirst({
      where: {
        id: entryId,
        companyId,
      },
      include: financialEntryInclude,
    });
  }

  async updateEntry(
    entryId: string,
    input: {
      accountId: string;
      financialCategoryId?: string;
      customerId?: string;
      orderId?: string;
      quoteId?: string;
      entryType: "INCOME" | "EXPENSE";
      category: string;
      description: string;
      amount: number;
      dueDate: Date;
      status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
      paidAt?: Date | null;
      updatedByUserId: string;
      items?: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    },
  ) {
    return this.db.$transaction(async (tx) => {
      await reverseSaleStock(tx, {
        entryId,
        reversedByUserId: input.updatedByUserId,
      });

      await tx.financialEntryItem.deleteMany({
        where: {
          entryId,
        },
      });

      const updatedEntry = await tx.financialEntry.update({
        where: { id: entryId },
        data: {
          accountId: input.accountId,
          financialCategoryId: input.financialCategoryId,
          customerId: input.customerId,
          orderId: input.orderId,
          quoteId: input.quoteId,
          entryType: input.entryType,
          category: input.category,
          description: input.description,
          amount: input.amount,
          dueDate: input.dueDate,
          status: input.status,
          paidAt: input.paidAt,
          items: input.items?.length
            ? {
                create: input.items.map((item) => ({
                  productId: item.productId,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                })),
              }
            : undefined,
        },
        include: financialEntryInclude,
      });

      await synchronizeSaleStock(tx, {
        companyId: updatedEntry.companyId,
        entry: updatedEntry,
        actorUserId: input.updatedByUserId,
      });

      return tx.financialEntry.findUniqueOrThrow({
        where: { id: entryId },
        include: financialEntryInclude,
      });
    });
  }

  async updateEntryStatus(
    entryId: string,
    input: {
      status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
      paidAt?: Date | null;
      updatedByUserId: string;
    },
  ) {
    return this.db.$transaction(async (tx) => {
      const currentEntry = await tx.financialEntry.findUniqueOrThrow({
        where: { id: entryId },
        include: financialEntryInclude,
      });

      const updatedEntry = await tx.financialEntry.update({
        where: { id: entryId },
        data: input,
        include: financialEntryInclude,
      });

      if (currentEntry.status !== "CANCELED" && updatedEntry.status === "CANCELED") {
        await reverseSaleStock(tx, {
          entryId,
          reversedByUserId: input.updatedByUserId,
        });
      }

      if (currentEntry.status === "CANCELED" && updatedEntry.status !== "CANCELED") {
        await synchronizeSaleStock(tx, {
          companyId: updatedEntry.companyId,
          entry: updatedEntry,
          actorUserId: input.updatedByUserId,
        });
      }

      return tx.financialEntry.findUniqueOrThrow({
        where: { id: entryId },
        include: financialEntryInclude,
      });
    });
  }
}

const financialEntryInclude = {
  account: true,
  customer: true,
  inventoryEntry: true,
  order: true,
  quote: true,
  financialCategory: true,
  items: {
    include: {
      product: true,
    },
  },
} as const;

type Tx = Prisma.TransactionClient;

async function synchronizeSaleStock(
  tx: Tx,
  input: {
    companyId: string;
    entry: Prisma.FinancialEntryGetPayload<{ include: typeof financialEntryInclude }>;
    actorUserId: string;
  },
) {
  if (!isTrackedSale(input.entry)) {
    return;
  }

  for (const item of input.entry.items) {
    if (!item.productId || !item.product?.controlsStock) {
      continue;
    }

    await registerOutputStockByFifo(tx, {
      companyId: input.companyId,
      productId: item.productId,
      quantity: toNumber(item.quantity),
      reasonCode: "DIVERSE_OUTPUT",
      reasonText: `Venda ${buildSaleReference(input.entry)}`,
      referenceType: "MANUAL",
      referenceId: input.entry.id,
      notes: `Saida automatica da venda ${buildSaleReference(input.entry)} | ${item.description}`,
      createdByUserId: input.actorUserId,
    });
  }
}

async function reverseSaleStock(
  tx: Tx,
  input: {
    entryId: string;
    reversedByUserId: string;
  },
) {
  const saleMovements = await tx.stockMovement.findMany({
    where: {
      movementType: "OUTPUT",
      referenceType: "MANUAL",
      referenceId: input.entryId,
      status: "CONFIRMED",
    },
    include: {
      product: true,
      fifoConsumptions: true,
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  for (const movement of saleMovements) {
    for (const consumption of movement.fifoConsumptions) {
      await tx.stockLayer.update({
        where: { id: consumption.stockLayerId },
        data: {
          availableQuantity: {
            increment: toNumber(consumption.quantityConsumed),
          },
        },
      });
    }

    if (movement.product.controlsStock) {
      await tx.product.update({
        where: { id: movement.productId },
        data: {
          currentStock: {
            increment: toNumber(movement.quantity),
          },
        },
      });
    }

    await tx.stockMovement.update({
      where: { id: movement.id },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
        reversedByUserId: input.reversedByUserId,
        notes: appendReversalNote(movement.notes),
      },
    });
  }
}

function isTrackedSale(entry: Prisma.FinancialEntryGetPayload<{ include: typeof financialEntryInclude }>) {
  return entry.entryType === "INCOME" && entry.status !== "CANCELED" && entry.items.length > 0;
}

function buildSaleReference(entry: { id: string; description: string }) {
  return `#${entry.id.slice(0, 8)}`;
}

function appendReversalNote(previousNotes?: string | null) {
  const suffix = "Movimento estornado por alteracao ou cancelamento da venda.";
  if (!previousNotes?.trim()) {
    return suffix;
  }

  if (previousNotes.includes(suffix)) {
    return previousNotes;
  }

  return `${previousNotes} | ${suffix}`;
}
