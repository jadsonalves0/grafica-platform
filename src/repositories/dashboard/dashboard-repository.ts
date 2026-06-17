import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export class DashboardRepository {
  constructor(private readonly db: PrismaClient) {}

  async getSummary(companyId: string) {
    const [
      customersCount,
      draftQuotesCount,
      approvedQuotesCount,
      openOrdersCount,
      productionOrdersCount,
      lowStockProductsCount,
      financialSummary,
    ] = await Promise.all([
      this.db.customer.count({
        where: { companyId },
      }),
      this.db.quote.count({
        where: { companyId, status: "DRAFT" },
      }),
      this.db.quote.count({
        where: { companyId, status: "APPROVED" },
      }),
      this.db.order.count({
        where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      this.db.order.count({
        where: {
          companyId,
          productionStatus: { in: ["PENDING", "IN_PRODUCTION", "WAITING_APPROVAL"] },
        },
      }),
      this.db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM products
        WHERE company_id = ${companyId}::uuid
          AND is_active = true
          AND current_stock <= minimum_stock
      `),
      this.db.financialEntry.findMany({
        where: { companyId },
        select: {
          entryType: true,
          status: true,
          amount: true,
        },
      }),
    ]);

    const cashFlow = financialSummary.reduce(
      (acc, entry) => {
        const amount = toNumber(entry.amount);

        if (entry.entryType === "INCOME" && entry.status === "PENDING") {
          acc.pendingIncome += amount;
        }

        if (entry.entryType === "EXPENSE" && entry.status === "PENDING") {
          acc.pendingExpense += amount;
        }

        if (entry.entryType === "INCOME" && entry.status === "PAID") {
          acc.paidIncome += amount;
        }

        if (entry.entryType === "EXPENSE" && entry.status === "PAID") {
          acc.paidExpense += amount;
        }

        return acc;
      },
      {
        pendingIncome: 0,
        pendingExpense: 0,
        paidIncome: 0,
        paidExpense: 0,
      },
    );

    const accounts = await this.db.financialAccount.findMany({
      where: { companyId },
      select: { initialBalance: true },
    });

    const initialBalance = accounts.reduce(
      (sum, account) => sum + toNumber(account.initialBalance),
      0,
    );

    return {
      customersCount,
      draftQuotesCount,
      approvedQuotesCount,
      openOrdersCount,
      productionOrdersCount,
      lowStockProductsCount: Number(lowStockProductsCount[0]?.count ?? 0),
      pendingIncome: roundCurrency(cashFlow.pendingIncome),
      pendingExpense: roundCurrency(cashFlow.pendingExpense),
      projectedBalance: roundCurrency(
        initialBalance +
          cashFlow.paidIncome -
          cashFlow.paidExpense +
          cashFlow.pendingIncome -
          cashFlow.pendingExpense,
      ),
    };
  }
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
