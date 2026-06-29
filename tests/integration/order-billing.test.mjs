import assert from "node:assert/strict";

import { prisma } from "../../src/lib/db/prisma.ts";
import { PERMISSIONS } from "../../src/lib/permissions/permission-types.ts";
import { CustomerRepository } from "../../src/repositories/customers/customer-repository.ts";
import { FinancialRepository } from "../../src/repositories/financial/financial-repository.ts";
import { InventoryRepository } from "../../src/repositories/inventory/inventory-repository.ts";
import {
  registerInputStock,
  toNumber,
} from "../../src/repositories/inventory/stock-ledger.ts";
import { OrderRepository } from "../../src/repositories/orders/order-repository.ts";
import { QuoteRepository } from "../../src/repositories/quotes/quote-repository.ts";
import { AuthorizationService } from "../../src/services/auth/authorization-service.ts";
import { FinancialService } from "../../src/services/financial/financial-service.ts";
import { OrderService } from "../../src/services/orders/order-service.ts";

export const cases = [
  {
    name: "pedido entregue faturado pendente gera venda, estoque e contas a receber abertas",
    async run() {
      const fixture = await createFixture("order-billing-pending");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Produto pedido"),
          type: "RESALE",
          controlsStock: true,
          salePrice: 25,
        });

        await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 4,
          unitCost: 8,
          accountId: fixture.account.id,
        });

        const order = await createDeliveredOrder({
          companyId: fixture.company.id,
          customerId: fixture.customer.id,
          product,
          userId: fixture.user.id,
          quantity: 2,
          unitPrice: 25,
        });

        const result = await fixture.orderService.billOrder(
          fixture.context,
          fixture.company.id,
          order.id,
          {
            paymentStatus: "PENDING",
          },
        );

        const billedEntry = await prisma.financialEntry.findFirstOrThrow({
          where: {
            companyId: fixture.company.id,
            orderId: order.id,
          },
          include: {
            items: true,
          },
        });
        const snapshot = await getStockSnapshot(product.id);

        assert.match(result.message, /contas a receber/i);
        assert.equal(result.order.status, "COMPLETED");
        assert.equal(result.order.financials.length, 1);
        assert.equal(result.order.financials[0].status, "PENDING");
        assert.equal(billedEntry.status, "PENDING");
        assert.equal(billedEntry.entryType, "INCOME");
        assert.equal(toNumber(billedEntry.amount), 50);
        assert.equal(billedEntry.items.length, 1);
        assert.equal(snapshot.currentStock, 2);
        assert.equal(snapshot.fifoAvailable, 2);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "pedido entregue recebido no ato fica pago sem permanecer em aberto",
    async run() {
      const fixture = await createFixture("order-billing-paid");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Produto pago"),
          type: "RESALE",
          controlsStock: true,
          salePrice: 40,
        });

        await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 3,
          unitCost: 15,
          accountId: fixture.account.id,
        });

        const order = await createDeliveredOrder({
          companyId: fixture.company.id,
          customerId: fixture.customer.id,
          product,
          userId: fixture.user.id,
          quantity: 1,
          unitPrice: 40,
        });

        const result = await fixture.orderService.billOrder(
          fixture.context,
          fixture.company.id,
          order.id,
          {
            paymentStatus: "PAID",
          },
        );

        const billedEntry = await prisma.financialEntry.findFirstOrThrow({
          where: {
            companyId: fixture.company.id,
            orderId: order.id,
          },
        });
        const snapshot = await getStockSnapshot(product.id);

        assert.match(result.message, /recebido no ato/i);
        assert.equal(result.order.financials[0].status, "PAID");
        assert.equal(billedEntry.status, "PAID");
        assert.ok(billedEntry.paidAt instanceof Date);
        assert.equal(snapshot.currentStock, 2);
        assert.equal(snapshot.fifoAvailable, 2);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "pedido ja faturado nao cria segunda venda ativa",
    async run() {
      const fixture = await createFixture("order-billing-duplicate");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Produto duplicado"),
          type: "RESALE",
          controlsStock: true,
          salePrice: 18,
        });

        await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 2,
          unitCost: 7,
          accountId: fixture.account.id,
        });

        const order = await createDeliveredOrder({
          companyId: fixture.company.id,
          customerId: fixture.customer.id,
          product,
          userId: fixture.user.id,
          quantity: 1,
          unitPrice: 18,
        });

        await fixture.orderService.billOrder(fixture.context, fixture.company.id, order.id, {
          paymentStatus: "PENDING",
        });

        const secondAttempt = await fixture.orderService.billOrder(
          fixture.context,
          fixture.company.id,
          order.id,
          {
            paymentStatus: "PAID",
          },
        );

        const entries = await prisma.financialEntry.findMany({
          where: {
            companyId: fixture.company.id,
            orderId: order.id,
            status: {
              not: "CANCELED",
            },
          },
        });

        assert.equal(entries.length, 1);
        assert.match(secondAttempt.message, /ja estava faturado/i);
        assert.equal(secondAttempt.order.financials.length, 1);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "baixa de conta a receber muda para pago sem erro de prisma nem novo movimento",
    async run() {
      const fixture = await createFixture("order-billing-status");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Produto baixa"),
          type: "RESALE",
          controlsStock: true,
          salePrice: 30,
        });

        await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 2,
          unitCost: 10,
          accountId: fixture.account.id,
        });

        const order = await createDeliveredOrder({
          companyId: fixture.company.id,
          customerId: fixture.customer.id,
          product,
          userId: fixture.user.id,
          quantity: 1,
          unitPrice: 30,
        });

        await fixture.orderService.billOrder(fixture.context, fixture.company.id, order.id, {
          paymentStatus: "PENDING",
        });

        const entry = await prisma.financialEntry.findFirstOrThrow({
          where: {
            companyId: fixture.company.id,
            orderId: order.id,
          },
        });
        const beforeSnapshot = await getStockSnapshot(product.id);

        const updatedEntry = await fixture.financialService.updateEntryStatus(
          fixture.context,
          fixture.company.id,
          entry.id,
          {
            status: "PAID",
          },
        );

        const afterSnapshot = await getStockSnapshot(product.id);

        assert.equal(updatedEntry.status, "PAID");
        assert.ok(updatedEntry.paidAt instanceof Date);
        assert.equal(afterSnapshot.currentStock, beforeSnapshot.currentStock);
        assert.equal(afterSnapshot.outputMovements, beforeSnapshot.outputMovements);
      } finally {
        await fixture.cleanup();
      }
    },
  },
];

export async function afterAll() {
  await prisma.$disconnect();
}

async function createFixture(prefix) {
  const suffix = uniqueLabel(prefix);
  const user = await prisma.user.create({
    data: {
      name: `Teste ${suffix}`,
      email: `${suffix}@local.test`,
      passwordHash: "test-hash",
    },
  });

  const company = await prisma.company.create({
    data: {
      legalName: `Empresa ${suffix}`,
      tradeName: `Empresa ${suffix}`,
      slug: suffix.toLowerCase().slice(0, 80),
    },
  });

  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: `Cliente ${suffix}`,
      email: `${suffix}@cliente.test`,
    },
  });

  const account = await prisma.financialAccount.create({
    data: {
      companyId: company.id,
      name: `Caixa ${suffix}`,
      type: "CASH",
      initialBalance: 0,
    },
  });

  const category = await prisma.financialCategory.create({
    data: {
      companyId: company.id,
      name: `Receita ${suffix}`,
      type: "INCOME",
      isActive: true,
    },
  });

  const repositories = {
    customer: new CustomerRepository(prisma),
    financial: new FinancialRepository(prisma),
    inventory: new InventoryRepository(prisma),
    order: new OrderRepository(prisma),
    quote: new QuoteRepository(prisma),
  };
  const authorizationService = new AuthorizationService();
  const financialService = new FinancialService(
    repositories.financial,
    repositories.customer,
    repositories.inventory,
    repositories.order,
    repositories.quote,
    authorizationService,
  );
  const orderService = new OrderService(
    repositories.order,
    repositories.quote,
    repositories.customer,
    repositories.financial,
    financialService,
    authorizationService,
  );

  return {
    company,
    user,
    customer,
    account,
    category,
    financialService,
    orderService,
    context: {
      companyId: company.id,
      userId: user.id,
      isPlatformAdmin: false,
      permissions: [
        PERMISSIONS.ordersManageStatus,
        PERMISSIONS.financialManage,
        PERMISSIONS.financialView,
        PERMISSIONS.ordersView,
      ],
    },
    async cleanup() {
      await cleanupFixture(company.id, user.id);
    },
  };
}

async function createProduct(companyId, input) {
  return prisma.product.create({
    data: {
      companyId,
      name: input.name,
      unit: "un",
      type: input.type,
      controlsStock: input.controlsStock,
      showOnWebsite: false,
      costPrice: input.costPrice ?? 0,
      salePrice: input.salePrice ?? 20,
      minimumStock: 0,
      currentStock: 0,
      isActive: true,
    },
  });
}

async function createDeliveredOrder({
  companyId,
  customerId,
  product,
  userId,
  quantity,
  unitPrice,
}) {
  const totalPrice = roundCurrency(quantity * unitPrice);

  return prisma.order.create({
    data: {
      companyId,
      customerId,
      code: uniqueLabel("PED"),
      status: "IN_PROGRESS",
      productionStatus: "DELIVERED",
      deliveryDate: new Date("2026-06-26"),
      totalAmount: totalPrice,
      createdByUserId: userId,
      items: {
        create: {
          companyId,
          productId: product.id,
          description: product.name,
          quantity,
          unitPrice,
          totalPrice,
        },
      },
    },
    include: {
      items: true,
    },
  });
}

async function createConfirmedEntry({
  companyId,
  userId,
  product,
  quantity,
  unitCost,
  accountId,
}) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.inventoryEntry.create({
      data: {
        companyId,
        entryType: "PURCHASE_WITHOUT_INVOICE",
        documentNumber: uniqueLabel("ENT"),
        entryDate: new Date("2026-06-25"),
        financialCondition: "NONE",
        financialAccountId: accountId,
        installmentCount: 1,
        subtotal: quantity * unitCost,
        totalAmount: quantity * unitCost,
      },
    });

    await tx.inventoryEntryItem.create({
      data: {
        inventoryEntryId: entry.id,
        productId: product.id,
        description: product.name,
        unit: product.unit,
        quantity,
        unitCost,
        subtotal: quantity * unitCost,
      },
    });

    await registerInputStock(tx, {
      companyId,
      productId: product.id,
      quantity,
      unitCost,
      reasonCode: "ENTRY_CONFIRMATION",
      reasonText: entry.documentNumber,
      referenceType: "ENTRY",
      referenceId: entry.documentNumber,
      inventoryEntryId: entry.id,
      occurredAt: entry.entryDate,
      createdByUserId: userId,
      updateReferenceCost: true,
    });

    return tx.inventoryEntry.update({
      where: { id: entry.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedByUserId: userId,
      },
    });
  });
}

async function getStockSnapshot(productId) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      stockLayers: true,
      stockMoves: true,
      stockLayerConsumptions: true,
    },
  });

  return {
    currentStock: toNumber(product.currentStock),
    fifoAvailable: roundQuantity(
      product.stockLayers.reduce((sum, layer) => sum + toNumber(layer.availableQuantity), 0),
    ),
    outputMovements: product.stockMoves.filter((movement) => movement.movementType === "OUTPUT").length,
    consumedQuantity: roundQuantity(
      product.stockLayerConsumptions.reduce(
        (sum, consumption) => sum + toNumber(consumption.quantityConsumed),
        0,
      ),
    ),
  };
}

async function cleanupFixture(companyId, userId) {
  const inventoryEntryIds = (
    await prisma.inventoryEntry.findMany({
      where: { companyId },
      select: { id: true },
    })
  ).map((entry) => entry.id);

  const orderIds = (
    await prisma.order.findMany({
      where: { companyId },
      select: { id: true },
    })
  ).map((order) => order.id);

  const financialEntryIds = (
    await prisma.financialEntry.findMany({
      where: { companyId },
      select: { id: true },
    })
  ).map((entry) => entry.id);

  await prisma.stockLayerConsumption.deleteMany({ where: { companyId } });
  await prisma.stockLayer.deleteMany({ where: { companyId } });
  await prisma.stockMovement.deleteMany({ where: { companyId } });

  if (financialEntryIds.length > 0) {
    await prisma.financialEntryItem.deleteMany({
      where: {
        entryId: {
          in: financialEntryIds,
        },
      },
    });
  }

  if (orderIds.length > 0) {
    await prisma.orderItem.deleteMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
    });
  }

  if (inventoryEntryIds.length > 0) {
    await prisma.inventoryEntryItem.deleteMany({
      where: {
        inventoryEntryId: {
          in: inventoryEntryIds,
        },
      },
    });
  }

  await prisma.financialEntry.deleteMany({ where: { companyId } });
  await prisma.inventoryEntry.deleteMany({ where: { companyId } });
  await prisma.order.deleteMany({ where: { companyId } });
  await prisma.companyOperationalSetting.deleteMany({ where: { companyId } });
  await prisma.financialCategory.deleteMany({ where: { companyId } });
  await prisma.financialAccount.deleteMany({ where: { companyId } });
  await prisma.productPriceHistory.deleteMany({ where: { companyId } });
  await prisma.product.deleteMany({ where: { companyId } });
  await prisma.customer.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

function uniqueLabel(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value) {
  return Math.round(value * 1000) / 1000;
}
