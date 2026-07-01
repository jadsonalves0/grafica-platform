import assert from "node:assert/strict";

import { prisma } from "../../src/lib/db/prisma.ts";
import { PERMISSIONS } from "../../src/lib/permissions/permission-types.ts";
import { AuditRepository } from "../../src/repositories/audit/audit-repository.ts";
import { InventoryRepository } from "../../src/repositories/inventory/inventory-repository.ts";
import { AuthorizationService } from "../../src/services/auth/authorization-service.ts";
import { InventoryService } from "../../src/services/inventory/inventory-service.ts";

export const cases = [
  {
    name: "calcula sugestao de compra com fornecedor recente e fator de conversao",
    async run() {
      const fixture = await createFixture("purchase-suggestions");

      try {
        const supplier = await prisma.supplier.create({
          data: {
            companyId: fixture.company.id,
            legalName: "Fornecedor Papel",
            tradeName: "Fornecedor Papel",
            document: "72345678000123",
            isActive: true,
          },
        });

        const product = await prisma.product.create({
          data: {
            companyId: fixture.company.id,
            name: uniqueLabel("Papel Offset A4"),
            unit: "fl",
            type: "RAW_MATERIAL",
            controlsStock: true,
            costPrice: 0.8,
            salePrice: 1.2,
            minimumStock: 10,
            currentStock: 2,
            isActive: true,
          },
        });

        const movement = await prisma.stockMovement.create({
          data: {
            company: { connect: { id: fixture.company.id } },
            product: { connect: { id: product.id } },
            movementType: "INPUT",
            status: "CONFIRMED",
            reasonCode: "INITIAL_BALANCE",
            quantity: 2,
            unitCost: 0.8,
            occurredAt: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        await prisma.stockLayer.create({
          data: {
            company: { connect: { id: fixture.company.id } },
            product: { connect: { id: product.id } },
            stockMovement: { connect: { id: movement.id } },
            originalQuantity: 2,
            availableQuantity: 2,
            unitCost: 0.8,
            entryDate: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        await prisma.supplierItemMapping.create({
          data: {
            companyId: fixture.company.id,
            supplierId: supplier.id,
            supplierDocument: "72345678000123",
            supplierName: "Fornecedor Papel",
            supplierProductCode: "PAP-OFF-A4",
            supplierProductName: "Papel Offset A4 Pacote",
            internalItemId: product.id,
            purchaseUnit: "pct",
            stockUnit: "fl",
            conversionFactor: 500,
            confidence: 98,
            lastUsedAt: new Date("2026-06-29T10:00:00.000Z"),
            createdByUserId: fixture.user.id,
            updatedByUserId: fixture.user.id,
          },
        });

        const healthyProduct = await prisma.product.create({
          data: {
            companyId: fixture.company.id,
            name: uniqueLabel("Produto sem reposicao"),
            unit: "un",
            type: "RESALE",
            controlsStock: true,
            costPrice: 12,
            salePrice: 20,
            minimumStock: 5,
            currentStock: 8,
            isActive: true,
          },
        });

        const healthyMovement = await prisma.stockMovement.create({
          data: {
            company: { connect: { id: fixture.company.id } },
            product: { connect: { id: healthyProduct.id } },
            movementType: "INPUT",
            status: "CONFIRMED",
            reasonCode: "INITIAL_BALANCE",
            quantity: 8,
            unitCost: 12,
            occurredAt: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        await prisma.stockLayer.create({
          data: {
            company: { connect: { id: fixture.company.id } },
            product: { connect: { id: healthyProduct.id } },
            stockMovement: { connect: { id: healthyMovement.id } },
            originalQuantity: 8,
            availableQuantity: 8,
            unitCost: 12,
            entryDate: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        const suggestions = await fixture.inventoryService.listPurchaseSuggestions(
          fixture.context,
          fixture.company.id,
        );

        assert.equal(suggestions.length, 1);
        assert.equal(suggestions[0].product.id, product.id);
        assert.equal(suggestions[0].preferredSupplierId, supplier.id);
        assert.equal(suggestions[0].preferredSupplierName, "Fornecedor Papel");
        assert.equal(suggestions[0].purchaseUnit, "pct");
        assert.equal(suggestions[0].conversionFactor, 500);
        assert.equal(suggestions[0].shortageQuantity, 8);
        assert.equal(suggestions[0].suggestedPurchaseQuantity, 0.016);
        assert.equal(suggestions[0].estimatedPurchaseValue, 6.4);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "isola sugestoes de compra por empresa",
    async run() {
      const firstFixture = await createFixture("purchase-suggestions-a");
      const secondFixture = await createFixture("purchase-suggestions-b");

      try {
        await prisma.product.create({
          data: {
            companyId: firstFixture.company.id,
            name: uniqueLabel("Tinta Azul"),
            unit: "lt",
            type: "RAW_MATERIAL",
            controlsStock: true,
            costPrice: 45,
            salePrice: 60,
            minimumStock: 3,
            currentStock: 1,
            isActive: true,
          },
        });

        const firstMovement = await prisma.stockMovement.create({
          data: {
            company: { connect: { id: firstFixture.company.id } },
            product: {
              connect: {
                id: (
                  await prisma.product.findFirstOrThrow({
                    where: { companyId: firstFixture.company.id },
                  })
                ).id,
              },
            },
            movementType: "INPUT",
            status: "CONFIRMED",
            reasonCode: "INITIAL_BALANCE",
            quantity: 1,
            unitCost: 45,
            occurredAt: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        await prisma.stockLayer.create({
          data: {
            company: { connect: { id: firstFixture.company.id } },
            product: {
              connect: {
                id: firstMovement.productId,
              },
            },
            stockMovement: { connect: { id: firstMovement.id } },
            originalQuantity: 1,
            availableQuantity: 1,
            unitCost: 45,
            entryDate: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        await prisma.product.create({
          data: {
            companyId: secondFixture.company.id,
            name: uniqueLabel("Bobina Vinil"),
            unit: "m",
            type: "RAW_MATERIAL",
            controlsStock: true,
            costPrice: 18,
            salePrice: 25,
            minimumStock: 10,
            currentStock: 2,
            isActive: true,
          },
        });

        const secondMovement = await prisma.stockMovement.create({
          data: {
            company: { connect: { id: secondFixture.company.id } },
            product: {
              connect: {
                id: (
                  await prisma.product.findFirstOrThrow({
                    where: { companyId: secondFixture.company.id },
                  })
                ).id,
              },
            },
            movementType: "INPUT",
            status: "CONFIRMED",
            reasonCode: "INITIAL_BALANCE",
            quantity: 2,
            unitCost: 18,
            occurredAt: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        await prisma.stockLayer.create({
          data: {
            company: { connect: { id: secondFixture.company.id } },
            product: {
              connect: {
                id: secondMovement.productId,
              },
            },
            stockMovement: { connect: { id: secondMovement.id } },
            originalQuantity: 2,
            availableQuantity: 2,
            unitCost: 18,
            entryDate: new Date("2026-06-30T10:00:00.000Z"),
          },
        });

        const firstSuggestions = await firstFixture.inventoryService.listPurchaseSuggestions(
          firstFixture.context,
          firstFixture.company.id,
        );
        const secondSuggestions = await secondFixture.inventoryService.listPurchaseSuggestions(
          secondFixture.context,
          secondFixture.company.id,
        );

        assert.equal(firstSuggestions.length, 1);
        assert.equal(secondSuggestions.length, 1);
        assert.notEqual(firstSuggestions[0].product.id, secondSuggestions[0].product.id);
      } finally {
        await firstFixture.cleanup();
        await secondFixture.cleanup();
      }
    },
  },
  {
    name: "gera pre-entrada a partir da sugestao de compra",
    async run() {
      const fixture = await createFixture("purchase-suggestions-draft");

      try {
        const supplier = await prisma.supplier.create({
          data: {
            companyId: fixture.company.id,
            legalName: "Fornecedor Lonas",
            tradeName: "Fornecedor Lonas",
            document: "51876543000189",
            isActive: true,
          },
        });

        const product = await prisma.product.create({
          data: {
            companyId: fixture.company.id,
            name: uniqueLabel("Bobina Lona Fosca"),
            unit: "m",
            type: "RAW_MATERIAL",
            controlsStock: true,
            costPrice: 23.5,
            salePrice: 39.9,
            minimumStock: 15,
            currentStock: 5,
            isActive: true,
          },
        });

        const movement = await prisma.stockMovement.create({
          data: {
            company: { connect: { id: fixture.company.id } },
            product: { connect: { id: product.id } },
            movementType: "INPUT",
            status: "CONFIRMED",
            reasonCode: "INITIAL_BALANCE",
            quantity: 5,
            unitCost: 23.5,
            occurredAt: new Date("2026-06-30T11:00:00.000Z"),
          },
        });

        await prisma.stockLayer.create({
          data: {
            company: { connect: { id: fixture.company.id } },
            product: { connect: { id: product.id } },
            stockMovement: { connect: { id: movement.id } },
            originalQuantity: 5,
            availableQuantity: 5,
            unitCost: 23.5,
            entryDate: new Date("2026-06-30T11:00:00.000Z"),
          },
        });

        await prisma.supplierItemMapping.create({
          data: {
            companyId: fixture.company.id,
            supplierId: supplier.id,
            supplierDocument: "51876543000189",
            supplierName: "Fornecedor Lonas",
            supplierProductCode: "LONA-FOSCA-440",
            supplierProductName: "Bobina Lona Fosca 440g",
            internalItemId: product.id,
            purchaseUnit: "rl",
            stockUnit: "m",
            conversionFactor: 50,
            confidence: 99,
            lastUsedAt: new Date("2026-06-29T10:00:00.000Z"),
            createdByUserId: fixture.user.id,
            updatedByUserId: fixture.user.id,
          },
        });

        const entry = await fixture.inventoryService.createPurchaseSuggestionEntryDraft(
          fixture.context,
          fixture.company.id,
          product.id,
        );

        assert.equal(entry.companyId, fixture.company.id);
        assert.equal(entry.entryType, "PURCHASE_WITHOUT_INVOICE");
        assert.equal(entry.status, "DRAFT");
        assert.equal(entry.supplierId, supplier.id);
        assert.equal(entry.supplierName, "Fornecedor Lonas");
        assert.match(entry.documentNumber, /^PRE-COMPRA-/);
        assert.equal(entry.financialCondition, "NONE");
        assert.equal(entry.items.length, 1);
        assert.equal(entry.items[0].productId, product.id);
        assert.equal(Number(entry.items[0].quantity), 10);
        assert.equal(Number(entry.items[0].unitCost), 23.5);
        assert.equal(Number(entry.totalAmount), 235);
        assert.match(entry.notes ?? "", /Pre-entrada gerada a partir de sugestao de compra\./);
        assert.match(entry.notes ?? "", /referencia 0,2 rl/i);
        assert.match(entry.notes ?? "", /cod\. fornecedor LONA-FOSCA-440/i);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "monta lista de compra agrupada por fornecedor e respeita selecao",
    async run() {
      const fixture = await createFixture("purchase-suggestions-list");

      try {
        const supplier = await prisma.supplier.create({
          data: {
            companyId: fixture.company.id,
            legalName: "Fornecedor Papelaria",
            tradeName: "Fornecedor Papelaria",
            document: "10444555000166",
            isActive: true,
          },
        });

        const [firstProduct, secondProduct] = await Promise.all([
          prisma.product.create({
            data: {
              companyId: fixture.company.id,
              name: uniqueLabel("Papel Couche 250g"),
              unit: "fl",
              type: "RAW_MATERIAL",
              controlsStock: true,
              costPrice: 0.45,
              salePrice: 0.7,
              minimumStock: 100,
              currentStock: 20,
              isActive: true,
            },
          }),
          prisma.product.create({
            data: {
              companyId: fixture.company.id,
              name: uniqueLabel("Papel Sulfite A3"),
              unit: "fl",
              type: "RAW_MATERIAL",
              controlsStock: true,
              costPrice: 0.3,
              salePrice: 0.55,
              minimumStock: 60,
              currentStock: 10,
              isActive: true,
            },
          }),
        ]);

        await prisma.stockMovement.createMany({
          data: [
            {
              companyId: fixture.company.id,
              productId: firstProduct.id,
              movementType: "INPUT",
              status: "CONFIRMED",
              reasonCode: "INITIAL_BALANCE",
              quantity: 20,
              unitCost: 0.45,
              occurredAt: new Date("2026-06-30T11:30:00.000Z"),
            },
            {
              companyId: fixture.company.id,
              productId: secondProduct.id,
              movementType: "INPUT",
              status: "CONFIRMED",
              reasonCode: "INITIAL_BALANCE",
              quantity: 10,
              unitCost: 0.3,
              occurredAt: new Date("2026-06-30T11:30:00.000Z"),
            },
          ],
        });

        const movements = await prisma.stockMovement.findMany({
          where: {
            companyId: fixture.company.id,
            productId: {
              in: [firstProduct.id, secondProduct.id],
            },
          },
        });

        await prisma.stockLayer.createMany({
          data: movements.map((movement) => ({
            companyId: fixture.company.id,
            productId: movement.productId,
            stockMovementId: movement.id,
            originalQuantity: Number(movement.quantity),
            availableQuantity: Number(movement.quantity),
            unitCost: Number(movement.unitCost),
            entryDate: new Date("2026-06-30T11:30:00.000Z"),
          })),
        });

        await prisma.supplierItemMapping.createMany({
          data: [
            {
              companyId: fixture.company.id,
              supplierId: supplier.id,
              supplierDocument: "10444555000166",
              supplierName: "Fornecedor Papelaria",
              supplierProductCode: "COUCHE-250",
              supplierProductName: "Papel Couche 250g",
              internalItemId: firstProduct.id,
              purchaseUnit: "pct",
              stockUnit: "fl",
              conversionFactor: 100,
              confidence: 98,
              lastUsedAt: new Date("2026-06-29T10:00:00.000Z"),
              createdByUserId: fixture.user.id,
              updatedByUserId: fixture.user.id,
            },
            {
              companyId: fixture.company.id,
              supplierId: supplier.id,
              supplierDocument: "10444555000166",
              supplierName: "Fornecedor Papelaria",
              supplierProductCode: "SULFITE-A3",
              supplierProductName: "Papel Sulfite A3",
              internalItemId: secondProduct.id,
              purchaseUnit: "pct",
              stockUnit: "fl",
              conversionFactor: 50,
              confidence: 96,
              lastUsedAt: new Date("2026-06-29T10:00:00.000Z"),
              createdByUserId: fixture.user.id,
              updatedByUserId: fixture.user.id,
            },
          ],
        });

        const list = await fixture.inventoryService.buildPurchaseList(
          fixture.context,
          fixture.company.id,
          {
            productIds: [firstProduct.id, secondProduct.id],
          },
        );

        assert.equal(list.selectionMode, "SELECTED");
        assert.equal(list.totalItems, 2);
        assert.equal(list.totalGroups, 1);
        assert.equal(list.groups.length, 1);
        assert.equal(list.groups[0].supplierId, supplier.id);
        assert.equal(list.groups[0].supplierName, "Fornecedor Papelaria");
        assert.equal(list.groups[0].items.length, 2);
        assert.equal(list.groups[0].estimatedPurchaseValue, 51);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "gera pre-entrada unica por fornecedor a partir da lista de compra",
    async run() {
      const fixture = await createFixture("purchase-suggestions-group-draft");

      try {
        const supplier = await prisma.supplier.create({
          data: {
            companyId: fixture.company.id,
            legalName: "Fornecedor Vinil",
            tradeName: "Fornecedor Vinil",
            document: "98999888000120",
            isActive: true,
          },
        });

        const [firstProduct, secondProduct] = await Promise.all([
          prisma.product.create({
            data: {
              companyId: fixture.company.id,
              name: uniqueLabel("Vinil Branco Fosco"),
              unit: "m",
              type: "RAW_MATERIAL",
              controlsStock: true,
              costPrice: 12,
              salePrice: 20,
              minimumStock: 20,
              currentStock: 5,
              isActive: true,
            },
          }),
          prisma.product.create({
            data: {
              companyId: fixture.company.id,
              name: uniqueLabel("Vinil Transparente"),
              unit: "m",
              type: "RAW_MATERIAL",
              controlsStock: true,
              costPrice: 16,
              salePrice: 28,
              minimumStock: 15,
              currentStock: 3,
              isActive: true,
            },
          }),
        ]);

        await prisma.stockMovement.createMany({
          data: [
            {
              companyId: fixture.company.id,
              productId: firstProduct.id,
              movementType: "INPUT",
              status: "CONFIRMED",
              reasonCode: "INITIAL_BALANCE",
              quantity: 5,
              unitCost: 12,
              occurredAt: new Date("2026-06-30T12:00:00.000Z"),
            },
            {
              companyId: fixture.company.id,
              productId: secondProduct.id,
              movementType: "INPUT",
              status: "CONFIRMED",
              reasonCode: "INITIAL_BALANCE",
              quantity: 3,
              unitCost: 16,
              occurredAt: new Date("2026-06-30T12:00:00.000Z"),
            },
          ],
        });

        const movements = await prisma.stockMovement.findMany({
          where: {
            companyId: fixture.company.id,
            productId: {
              in: [firstProduct.id, secondProduct.id],
            },
          },
        });

        await prisma.stockLayer.createMany({
          data: movements.map((movement) => ({
            companyId: fixture.company.id,
            productId: movement.productId,
            stockMovementId: movement.id,
            originalQuantity: Number(movement.quantity),
            availableQuantity: Number(movement.quantity),
            unitCost: Number(movement.unitCost),
            entryDate: new Date("2026-06-30T12:00:00.000Z"),
          })),
        });

        await prisma.supplierItemMapping.createMany({
          data: [
            {
              companyId: fixture.company.id,
              supplierId: supplier.id,
              supplierDocument: "98999888000120",
              supplierName: "Fornecedor Vinil",
              supplierProductCode: "VINIL-BRANCO",
              supplierProductName: "Vinil Branco Fosco",
              internalItemId: firstProduct.id,
              purchaseUnit: "rl",
              stockUnit: "m",
              conversionFactor: 50,
              confidence: 95,
              lastUsedAt: new Date("2026-06-29T10:00:00.000Z"),
              createdByUserId: fixture.user.id,
              updatedByUserId: fixture.user.id,
            },
            {
              companyId: fixture.company.id,
              supplierId: supplier.id,
              supplierDocument: "98999888000120",
              supplierName: "Fornecedor Vinil",
              supplierProductCode: "VINIL-TRANSP",
              supplierProductName: "Vinil Transparente",
              internalItemId: secondProduct.id,
              purchaseUnit: "rl",
              stockUnit: "m",
              conversionFactor: 50,
              confidence: 95,
              lastUsedAt: new Date("2026-06-29T10:00:00.000Z"),
              createdByUserId: fixture.user.id,
              updatedByUserId: fixture.user.id,
            },
          ],
        });

        const entry = await fixture.inventoryService.createPurchaseListEntryDraft(
          fixture.context,
          fixture.company.id,
          {
            companyId: fixture.company.id,
            productIds: [firstProduct.id, secondProduct.id],
            supplierId: supplier.id,
            supplierName: "Fornecedor Vinil",
            supplierDocument: "98999888000120",
          },
        );

        assert.equal(entry.entryType, "PURCHASE_WITHOUT_INVOICE");
        assert.equal(entry.status, "DRAFT");
        assert.equal(entry.supplierId, supplier.id);
        assert.equal(entry.supplierName, "Fornecedor Vinil");
        assert.equal(entry.items.length, 2);
        assert.deepEqual(
          entry.items.map((item) => item.productId).sort(),
          [firstProduct.id, secondProduct.id].sort(),
        );
        assert.equal(Number(entry.totalAmount), 372);
        assert.match(entry.notes ?? "", /Pre-entrada gerada a partir da lista de compra\./);
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

  const inventoryService = new InventoryService(
    new InventoryRepository(prisma),
    new AuditRepository(prisma),
    new AuthorizationService(),
  );

  return {
    company,
    user,
    inventoryService,
    context: {
      companyId: company.id,
      userId: user.id,
      isPlatformAdmin: false,
      permissions: [
        PERMISSIONS.inventoryView,
        PERMISSIONS.inventoryCreate,
        PERMISSIONS.inventoryUpdate,
      ],
    },
    async cleanup() {
      const inventoryEntryIds = (
        await prisma.inventoryEntry.findMany({
          where: { companyId: company.id },
          select: { id: true },
        })
      ).map((entry) => entry.id);

      await prisma.auditLog.deleteMany({ where: { companyId: company.id } });
      await prisma.stockLayerConsumption.deleteMany({ where: { companyId: company.id } });
      await prisma.stockLayer.deleteMany({ where: { companyId: company.id } });
      await prisma.stockMovement.deleteMany({ where: { companyId: company.id } });
      await prisma.productPriceHistory.deleteMany({ where: { companyId: company.id } });
      if (inventoryEntryIds.length > 0) {
        await prisma.inventoryEntryItem.deleteMany({
          where: {
            inventoryEntryId: {
              in: inventoryEntryIds,
            },
          },
        });
      }
      await prisma.inventoryEntry.deleteMany({ where: { companyId: company.id } });
        await prisma.$executeRawUnsafe(
          `DELETE FROM supplier_item_mappings WHERE company_id = $1::uuid`,
          company.id,
        );
        await prisma.supplier.deleteMany({ where: { companyId: company.id } });
        await prisma.companyOperationalSetting.deleteMany({ where: { companyId: company.id } });
      await prisma.product.deleteMany({ where: { companyId: company.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    },
  };
}

function uniqueLabel(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
