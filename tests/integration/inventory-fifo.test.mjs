import assert from "node:assert/strict";

import { prisma } from "../../src/lib/db/prisma.ts";
import {
  registerInputStock,
  registerOutputStockByFifo,
  registerOutputStockFromSpecificLayers,
} from "../../src/repositories/inventory/stock-ledger.ts";

export const cases = [
  {
    name: "entrada confirmada gera movimento e camada FIFO",
    async run() {
      const fixture = await createFixture("fifo-entry");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Materia FIFO"),
          type: "RESALE",
          controlsStock: true,
        });

        const entry = await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 2,
          unitCost: 10,
          accountId: fixture.account.id,
        });

        const snapshot = await getStockSnapshot(product.id);

        assert.equal(entry.status, "CONFIRMED");
        assert.equal(snapshot.currentStock, 2);
        assert.equal(snapshot.fifoAvailable, 2);
        assert.equal(snapshot.inputMovements, 1);
        assert.equal(snapshot.outputMovements, 0);
        assert.equal(snapshot.layers.length, 1);
        assert.equal(snapshot.layers[0].originalQuantity, 2);
        assert.equal(snapshot.layers[0].availableQuantity, 2);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "saida FIFO consome o saldo exato das camadas",
    async run() {
      const fixture = await createFixture("fifo-output");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Revenda FIFO"),
          type: "RESALE",
          controlsStock: true,
        });

        await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 2,
          unitCost: 12,
          accountId: fixture.account.id,
        });

        await prisma.$transaction(async (tx) => {
          await registerOutputStockByFifo(tx, {
            companyId: fixture.company.id,
            productId: product.id,
            quantity: 2,
            reasonCode: "DIVERSE_OUTPUT",
            reasonText: "Venda teste FIFO",
            referenceType: "MANUAL",
            referenceId: uniqueLabel("SALE"),
            createdByUserId: fixture.user.id,
          });
        });

        const snapshot = await getStockSnapshot(product.id);

        assert.equal(snapshot.currentStock, 0);
        assert.equal(snapshot.fifoAvailable, 0);
        assert.equal(snapshot.outputMovements, 1);
        assert.equal(snapshot.consumedQuantity, 2);
        assert.equal(snapshot.consumptionCost, 24);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "saldo acima do FIFO e bloqueado com mensagem operacional",
    async run() {
      const fixture = await createFixture("fifo-block");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Bloqueio FIFO"),
          type: "RESALE",
          controlsStock: true,
        });

        await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 2,
          unitCost: 8,
          accountId: fixture.account.id,
        });

        await assert.rejects(
          () =>
            prisma.$transaction((tx) =>
              registerOutputStockByFifo(tx, {
                companyId: fixture.company.id,
                productId: product.id,
                quantity: 3,
                reasonCode: "DIVERSE_OUTPUT",
                reasonText: "Venda acima do saldo",
                referenceType: "MANUAL",
                referenceId: uniqueLabel("SALE"),
                createdByUserId: fixture.user.id,
              }),
            ),
          (error) => {
            assert.match(String(error), new RegExp(product.name));
            assert.match(String(error), /2/);
            assert.match(String(error), /3/);
            assert.match(String(error), /controle FIFO/i);
            return true;
          },
        );
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "item de servico nao consome camadas de estoque",
    async run() {
      const fixture = await createFixture("fifo-service");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Servico financeiro"),
          type: "SERVICE",
          controlsStock: false,
        });

        await prisma.$transaction(async (tx) => {
          await registerOutputStockByFifo(tx, {
            companyId: fixture.company.id,
            productId: product.id,
            quantity: 1,
            reasonCode: "DIVERSE_OUTPUT",
            reasonText: "Venda de servico",
            referenceType: "MANUAL",
            referenceId: uniqueLabel("SALE"),
            createdByUserId: fixture.user.id,
          });
        });

        const snapshot = await getStockSnapshot(product.id);

        assert.equal(snapshot.currentStock, 0);
        assert.equal(snapshot.fifoAvailable, 0);
        assert.equal(snapshot.outputMovements, 1);
        assert.equal(snapshot.layers.length, 0);
        assert.equal(snapshot.consumedQuantity, 0);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "cancelamento de entrada remove disponibilidade quando nao houve consumo",
    async run() {
      const fixture = await createFixture("fifo-cancel");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Entrada cancelada"),
          type: "RESALE",
          controlsStock: true,
        });

        const entry = await createConfirmedEntry({
          companyId: fixture.company.id,
          userId: fixture.user.id,
          product,
          quantity: 2,
          unitCost: 9,
          accountId: fixture.account.id,
        });

        const layer = await prisma.stockLayer.findFirstOrThrow({
          where: {
            inventoryEntryId: entry.id,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        await prisma.$transaction(async (tx) => {
          await registerOutputStockFromSpecificLayers(tx, {
            companyId: fixture.company.id,
            productId: product.id,
            reasonCode: "ENTRY_REVERSAL",
            reasonText: "Regularizacao de teste",
            referenceType: "ENTRY",
            referenceId: entry.documentNumber,
            createdByUserId: fixture.user.id,
            layers: [
              {
                layerId: layer.id,
                quantity: 2,
                unitCost: 9,
              },
            ],
          });

          await tx.inventoryEntry.update({
            where: { id: entry.id },
            data: {
              status: "CANCELED",
              canceledAt: new Date(),
              canceledByUserId: fixture.user.id,
              cancelReason: "Regularizacao de teste",
            },
          });
        });

        const snapshot = await getStockSnapshot(product.id);
        const canceledEntry = await prisma.inventoryEntry.findUniqueOrThrow({
          where: { id: entry.id },
        });

        assert.equal(canceledEntry.status, "CANCELED");
        assert.equal(snapshot.currentStock, 0);
        assert.equal(snapshot.fifoAvailable, 0);
        assert.equal(snapshot.outputMovements, 1);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "regularizacao manual incide no item informado",
    async run() {
      const fixture = await createFixture("movement-item");

      try {
        const productA = await createProduct(fixture.company.id, {
          name: uniqueLabel("Mov A"),
          type: "RESALE",
          controlsStock: true,
        });
        const productB = await createProduct(fixture.company.id, {
          name: uniqueLabel("Mov B"),
          type: "RESALE",
          controlsStock: true,
        });

        await prisma.$transaction(async (tx) => {
          await registerInputStock(tx, {
            companyId: fixture.company.id,
            productId: productB.id,
            quantity: 1,
            unitCost: 5,
            reasonCode: "DIVERSE_INPUT",
            reasonText: "Ajuste no item B",
            referenceType: "MANUAL",
            referenceId: uniqueLabel("MOVE"),
            createdByUserId: fixture.user.id,
          });
        });

        const snapshotA = await getStockSnapshot(productA.id);
        const snapshotB = await getStockSnapshot(productB.id);

        assert.equal(snapshotA.currentStock, 0);
        assert.equal(snapshotB.currentStock, 1);
        assert.equal(snapshotB.fifoAvailable, 1);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "isolamento por empresa preserva o saldo do outro tenant",
    async run() {
      const fixtureA = await createFixture("tenant-a");
      const fixtureB = await createFixture("tenant-b");

      try {
        const productA = await createProduct(fixtureA.company.id, {
          name: uniqueLabel("Produto tenant A"),
          type: "RESALE",
          controlsStock: true,
        });
        const productB = await createProduct(fixtureB.company.id, {
          name: uniqueLabel("Produto tenant B"),
          type: "RESALE",
          controlsStock: true,
        });

        await createConfirmedEntry({
          companyId: fixtureA.company.id,
          userId: fixtureA.user.id,
          product: productA,
          quantity: 2,
          unitCost: 7,
          accountId: fixtureA.account.id,
        });
        await createConfirmedEntry({
          companyId: fixtureB.company.id,
          userId: fixtureB.user.id,
          product: productB,
          quantity: 2,
          unitCost: 11,
          accountId: fixtureB.account.id,
        });

        await prisma.$transaction(async (tx) => {
          await registerOutputStockByFifo(tx, {
            companyId: fixtureA.company.id,
            productId: productA.id,
            quantity: 1,
            reasonCode: "DIVERSE_OUTPUT",
            reasonText: "Venda tenant A",
            referenceType: "MANUAL",
            referenceId: uniqueLabel("SALE"),
            createdByUserId: fixtureA.user.id,
          });
        });

        const snapshotA = await getStockSnapshot(productA.id);
        const snapshotB = await getStockSnapshot(productB.id);

        assert.equal(snapshotA.currentStock, 1);
        assert.equal(snapshotA.fifoAvailable, 1);
        assert.equal(snapshotB.currentStock, 2);
        assert.equal(snapshotB.fifoAvailable, 2);
      } finally {
        await fixtureA.cleanup();
        await fixtureB.cleanup();
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

  const account = await prisma.financialAccount.create({
    data: {
      companyId: company.id,
      name: `Caixa ${suffix}`,
      type: "CASH",
      initialBalance: 0,
    },
  });

  return {
    company,
    user,
    account,
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
      costPrice: 0,
      salePrice: 20,
      minimumStock: 0,
      currentStock: 0,
      isActive: true,
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
    inputMovements: product.stockMoves.filter((movement) => movement.movementType === "INPUT").length,
    outputMovements: product.stockMoves.filter((movement) => movement.movementType === "OUTPUT").length,
    layers: product.stockLayers.map((layer) => ({
      originalQuantity: toNumber(layer.originalQuantity),
      availableQuantity: toNumber(layer.availableQuantity),
      unitCost: toNumber(layer.unitCost),
    })),
    consumedQuantity: roundQuantity(
      product.stockLayerConsumptions.reduce(
        (sum, consumption) => sum + toNumber(consumption.quantityConsumed),
        0,
      ),
    ),
    consumptionCost: roundCurrency(
      product.stockLayerConsumptions.reduce(
        (sum, consumption) => sum + toNumber(consumption.totalCost),
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

  await prisma.stockLayerConsumption.deleteMany({ where: { companyId } });
  await prisma.stockLayer.deleteMany({ where: { companyId } });
  await prisma.stockMovement.deleteMany({ where: { companyId } });

  if (inventoryEntryIds.length > 0) {
    await prisma.inventoryEntryItem.deleteMany({
      where: {
        inventoryEntryId: {
          in: inventoryEntryIds,
        },
      },
    });
  }

  await prisma.inventoryEntry.deleteMany({ where: { companyId } });
  await prisma.companyOperationalSetting.deleteMany({ where: { companyId } });
  await prisma.financialAccount.deleteMany({ where: { companyId } });
  await prisma.product.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

function uniqueLabel(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toNumber(value) {
  return typeof value === "number" ? value : value.toNumber();
}

function roundQuantity(value) {
  return Math.round(value * 1000) / 1000;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
