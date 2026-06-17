import type { FinancialEntryStatus, PrismaClient } from "@prisma/client";

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
    createdByUserId: string;
    items?: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) {
    return this.db.financialEntry.create({
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
      await tx.financialEntryItem.deleteMany({
        where: {
          entryId,
        },
      });

      return tx.financialEntry.update({
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
    });
  }

  async updateEntryStatus(
    entryId: string,
    input: {
      status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
      paidAt?: Date | null;
    },
  ) {
    return this.db.financialEntry.update({
      where: { id: entryId },
      data: input,
      include: financialEntryInclude,
    });
  }
}

const financialEntryInclude = {
  account: true,
  customer: true,
  order: true,
  quote: true,
  financialCategory: true,
  items: {
    include: {
      product: true,
    },
  },
} as const;
