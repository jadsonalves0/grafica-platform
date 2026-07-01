import assert from "node:assert/strict";
import { access, rm } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../src/lib/db/prisma.ts";
import { PERMISSIONS } from "../../src/lib/permissions/permission-types.ts";
import { AuditRepository } from "../../src/repositories/audit/audit-repository.ts";
import { InventoryRepository } from "../../src/repositories/inventory/inventory-repository.ts";
import { toNumber } from "../../src/repositories/inventory/stock-ledger.ts";
import { AuthorizationService } from "../../src/services/auth/authorization-service.ts";
import { InventoryService } from "../../src/services/inventory/inventory-service.ts";

export const cases = [
  {
    name: "importacao por XML cria rascunho conciliado e bloqueia chave duplicada",
    async run() {
      const fixture = await createFixture("xml-entry-match");

      try {
        const supplier = await prisma.supplier.create({
          data: {
            companyId: fixture.company.id,
            legalName: "Papelaria Importadora",
            tradeName: "Papelaria Importadora",
            document: "12345678000123",
            isActive: true,
          },
        });

        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Cartao 300g"),
          barcode: "7891111111111",
          unit: "un",
          type: "RESALE",
          salePrice: 18,
        });

        const xml = buildXml({
          number: "9001",
          accessKey: "35260612345678000123550010000123451000111111",
          supplierName: "Papelaria Importadora",
          supplierDocument: "12345678000123",
          items: [
            {
              lineNumber: 1,
              code: "FORN-001",
              description: product.name,
              ean: product.barcode,
              ncm: "48119090",
              cfop: "1102",
              unit: "un",
              quantity: "2.0000",
              unitPrice: "7.50",
              totalPrice: "15.00",
            },
          ],
        });

        const result = await fixture.inventoryService.importEntryXml(fixture.context, {
          companyId: fixture.company.id,
          xmlContent: xml,
          fileName: "entrada-9001.xml",
          mimeType: "application/xml",
        });

        const entry = await fixture.inventoryService.getEntry(
          fixture.context,
          fixture.company.id,
          result.draftEntryId,
        );

        assert.equal(result.document.number, "9001");
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].matchStatus, "MATCHED");
        assert.equal(result.items[0].matchedItemId, product.id);
        assert.equal(entry.source, "XML");
        assert.equal(entry.supplierId, supplier.id);
        assert.equal(entry.accessKey, "35260612345678000123550010000123451000111111");
        assert.equal(entry.attachments.length, 1);
        assert.match(entry.attachments[0].storagePath, /operational-documents/i);

        await assert.rejects(
          () =>
            fixture.inventoryService.importEntryXml(fixture.context, {
              companyId: fixture.company.id,
              xmlContent: xml,
              fileName: "entrada-9001.xml",
              mimeType: "application/xml",
            }),
          /chave de acesso/i,
        );
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "item sem conciliacao exige match manual antes de confirmar a entrada",
    async run() {
      const fixture = await createFixture("xml-entry-unmatched");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Adesivo Fosco"),
          unit: "un",
          type: "RESALE",
          salePrice: 12,
        });

        const xml = buildXml({
          number: "9002",
          accessKey: "35260612345678000123550010000123451000122222",
          supplierName: "Fornecedor Sem Mapa",
          supplierDocument: "22345678000123",
          items: [
            {
              lineNumber: 1,
              code: "SEM-MAPA-1",
              description: "Descricao externa sem item interno",
              ean: "SEM GTIN",
              ncm: "49111090",
              cfop: "1102",
              unit: "cx",
              quantity: "3.0000",
              unitPrice: "4.00",
              totalPrice: "12.00",
            },
          ],
        });

        const imported = await fixture.inventoryService.importEntryXml(fixture.context, {
          companyId: fixture.company.id,
          xmlContent: xml,
          fileName: "entrada-9002.xml",
          mimeType: "application/xml",
        });

        assert.equal(imported.items[0].matchStatus, "UNMATCHED");

        await assert.rejects(
          () =>
            fixture.inventoryService.confirmEntry(
              fixture.context,
              fixture.company.id,
              imported.draftEntryId,
              {},
            ),
          /sem conciliacao com produto interno/i,
        );

        const matchedEntry = await fixture.inventoryService.matchEntryItem(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          imported.items[0].entryItemId,
          {
            internalItemId: product.id,
            saveSupplierMapping: true,
            purchaseUnit: "cx",
            stockUnit: "un",
            conversionFactor: 1,
            confidence: 96,
          },
        );

        assert.equal(matchedEntry.items[0].productId, product.id);
        assert.equal(matchedEntry.items[0].matchStatus, "MATCHED");

        const confirmed = await fixture.inventoryService.confirmEntry(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          {},
        );

        const mappingCountRows = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS total FROM supplier_item_mappings WHERE company_id = $1::uuid`,
          fixture.company.id,
        );
        const snapshot = await getStockSnapshot(product.id);

        assert.equal(confirmed.status, "CONFIRMED");
        assert.equal(snapshot.currentStock, 3);
        assert.equal(snapshot.fifoAvailable, 3);
        assert.equal(snapshot.layers, 1);
        assert.equal(mappingCountRows[0].total, 1);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "sugestao de conciliacao exige confirmacao explicita antes da entrada",
    async run() {
      const fixture = await createFixture("xml-entry-suggested");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Papel Couche 300g A3 Pacote"),
          unit: "pct",
          type: "RAW_MATERIAL",
          salePrice: 42,
        });

        const xml = buildXml({
          number: "9005",
          accessKey: "35260612345678000123550010000123451000155555",
          supplierName: "Fornecedor Sugestao",
          supplierDocument: "52345678000123",
          items: [
            {
              lineNumber: 1,
              code: "SUG-001",
              description: "Papel Couche 300g A3",
              ean: "SEM GTIN",
              ncm: "48119090",
              cfop: "1102",
              unit: "pct",
              quantity: "1.0000",
              unitPrice: "19.50",
              totalPrice: "19.50",
            },
          ],
        });

        const imported = await fixture.inventoryService.importEntryXml(fixture.context, {
          companyId: fixture.company.id,
          xmlContent: xml,
          fileName: "entrada-9005.xml",
          mimeType: "application/xml",
        });

        assert.equal(imported.items[0].matchStatus, "SUGGESTED");
        assert.equal(imported.items[0].matchedItemId, product.id);

        await assert.rejects(
          () =>
            fixture.inventoryService.confirmEntry(
              fixture.context,
              fixture.company.id,
              imported.draftEntryId,
              {},
            ),
          /sugestao de conciliacao/i,
        );

        const matchedEntry = await fixture.inventoryService.matchEntryItem(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          imported.items[0].entryItemId,
          {
            internalItemId: product.id,
            saveSupplierMapping: true,
            purchaseUnit: "pct",
            stockUnit: "pct",
            conversionFactor: 1,
            confidence: 85,
          },
        );

        assert.equal(matchedEntry.items[0].matchStatus, "MATCHED");

        const confirmed = await fixture.inventoryService.confirmEntry(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          {},
        );

        const snapshot = await getStockSnapshot(product.id);

        assert.equal(confirmed.status, "CONFIRMED");
        assert.equal(snapshot.currentStock, 1);
        assert.equal(snapshot.fifoAvailable, 1);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "item sem conciliacao pode virar item interno e ser vinculado no mesmo fluxo",
    async run() {
      const fixture = await createFixture("xml-entry-create-product");

      try {
        const xml = buildXml({
          number: "9004",
          accessKey: "35260612345678000123550010000123451000144444",
          supplierName: "Fornecedor Cadastro Rapido",
          supplierDocument: "42345678000123",
          items: [
            {
              lineNumber: 1,
              code: "CAD-001",
              description: "Papel Reciclado 180g A4",
              ean: "7893333333333",
              ncm: "48025610",
              cfop: "1102",
              unit: "pct",
              quantity: "2.0000",
              unitPrice: "18.00",
              totalPrice: "36.00",
            },
          ],
        });

        const imported = await fixture.inventoryService.importEntryXml(fixture.context, {
          companyId: fixture.company.id,
          xmlContent: xml,
          fileName: "entrada-9004.xml",
          mimeType: "application/xml",
        });

        const created = await fixture.inventoryService.createProductFromEntryItem(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          imported.items[0].entryItemId,
          {
            name: "Papel Reciclado 180g A4",
            sku: "PAPREC180A4",
            barcode: "7893333333333",
            type: "RAW_MATERIAL",
            unit: "pct",
            controlsStock: true,
            costPrice: 18,
            salePrice: 25,
            minimumStock: 1,
            saveSupplierMapping: true,
            purchaseUnit: "pct",
            stockUnit: "pct",
            conversionFactor: 1,
          },
        );

        const confirmed = await fixture.inventoryService.confirmEntry(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          {},
        );

        const createdProduct = await prisma.product.findUniqueOrThrow({
          where: { id: created.product.id },
        });
        const mappingCountRows = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS total FROM supplier_item_mappings WHERE company_id = $1::uuid AND internal_item_id = $2::uuid`,
          fixture.company.id,
          created.product.id,
        );
        const snapshot = await getStockSnapshot(created.product.id);

        assert.equal(created.entry.items[0].productId, created.product.id);
        assert.equal(created.entry.items[0].matchStatus, "MATCHED");
        assert.equal(createdProduct.name, "Papel Reciclado 180g A4");
        assert.equal(createdProduct.sku, "PAPREC180A4");
        assert.equal(confirmed.status, "CONFIRMED");
        assert.equal(snapshot.currentStock, 2);
        assert.equal(snapshot.fifoAvailable, 2);
        assert.equal(mappingCountRows[0].total, 1);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "entrada importada permite revisar financeiro e gera conta a pagar na confirmacao",
    async run() {
      const fixture = await createFixture("xml-entry-financial");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Papel Sulfite"),
          barcode: "7892222222222",
          unit: "resma",
          type: "RAW_MATERIAL",
          salePrice: 35,
        });

        const xml = buildXml({
          number: "9003",
          accessKey: "35260612345678000123550010000123451000133333",
          supplierName: "Fornecedor Financeiro",
          supplierDocument: "32345678000123",
          items: [
            {
              lineNumber: 1,
              code: "FIN-001",
              description: product.name,
              ean: product.barcode,
              ncm: "48025610",
              cfop: "1102",
              unit: "resma",
              quantity: "4.0000",
              unitPrice: "12.50",
              totalPrice: "50.00",
            },
          ],
        });

        const imported = await fixture.inventoryService.importEntryXml(fixture.context, {
          companyId: fixture.company.id,
          xmlContent: xml,
          fileName: "entrada-9003.xml",
          mimeType: "application/xml",
        });

        const draftEntry = await fixture.inventoryService.getEntry(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
        );

        const updatedDraft = await fixture.inventoryService.updateEntry(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          {
            entryType: "PURCHASE_INVOICE",
            supplierName: draftEntry.supplierName ?? "Fornecedor Financeiro",
            documentNumber: draftEntry.documentNumber,
            entryDate: new Date(draftEntry.entryDate).toISOString().slice(0, 10),
            notes: "Revisao financeira da importacao XML",
            financialCondition: "TERM",
            financialAccountId: fixture.account.id,
            installmentCount: 2,
            firstDueDate: "2026-07-10",
            items: draftEntry.items.map((item) => ({
              id: item.id,
              productId: item.productId ?? undefined,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitCost: item.unitCost,
            })),
          },
        );

        assert.equal(updatedDraft.financialCondition, "TERM");
        assert.equal(updatedDraft.financialAccountId, fixture.account.id);
        assert.equal(updatedDraft.installmentCount, 2);

        const confirmed = await fixture.inventoryService.confirmEntry(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          {},
        );

        const financialEntries = await prisma.financialEntry.findMany({
          where: {
            companyId: fixture.company.id,
            inventoryEntryId: imported.draftEntryId,
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        });

        assert.equal(confirmed.status, "CONFIRMED");
        assert.equal(confirmed.financialEntries.length, 2);
        assert.equal(financialEntries.length, 2);
        assert.equal(financialEntries[0].entryType, "PAYABLE");
        assert.equal(financialEntries[0].status, "PENDING");
        assert.equal(toNumber(financialEntries[0].amount), 25);
        assert.equal(toNumber(financialEntries[1].amount), 25);
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "entrada permite anexar documento manual e protege o XML original importado",
    async run() {
      const fixture = await createFixture("xml-entry-attachments");

      try {
        const product = await createProduct(fixture.company.id, {
          name: uniqueLabel("Bobina Adesiva"),
          barcode: "7894444444444",
          unit: "rolo",
          type: "RAW_MATERIAL",
          salePrice: 55,
        });

        const xml = buildXml({
          number: "9006",
          accessKey: "35260612345678000123550010000123451000166666",
          supplierName: "Fornecedor Anexos",
          supplierDocument: "62345678000123",
          items: [
            {
              lineNumber: 1,
              code: "ANX-001",
              description: product.name,
              ean: product.barcode,
              ncm: "39199090",
              cfop: "1102",
              unit: "rolo",
              quantity: "2.0000",
              unitPrice: "21.00",
              totalPrice: "42.00",
            },
          ],
        });

        const imported = await fixture.inventoryService.importEntryXml(fixture.context, {
          companyId: fixture.company.id,
          xmlContent: xml,
          fileName: "entrada-9006.xml",
          mimeType: "application/xml",
        });

        const uploadedEntry = await fixture.inventoryService.addEntryAttachment(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          {
            fileName: "boleto-entrada-9006.pdf",
            mimeType: "application/pdf",
            fileSize: 128,
            content: Buffer.from("boleto da entrada 9006"),
            documentType: "BOLETO",
            source: "MANUAL_UPLOAD",
          },
        );

        const manualAttachment = uploadedEntry.attachments.find(
          (attachment) => attachment.documentType === "BOLETO",
        );
        const xmlAttachment = uploadedEntry.attachments.find(
          (attachment) => attachment.documentType === "XML_NFE",
        );

        assert.equal(uploadedEntry.attachments.length, 2);
        assert.ok(manualAttachment);
        assert.ok(xmlAttachment);

        const manualAttachmentPath = path.resolve(process.cwd(), manualAttachment.storagePath);
        await access(manualAttachmentPath);

        await assert.rejects(
          () =>
            fixture.inventoryService.removeEntryAttachment(
              fixture.context,
              fixture.company.id,
              imported.draftEntryId,
              xmlAttachment.id,
            ),
          /nao pode ser removido/i,
        );

        const cleanedEntry = await fixture.inventoryService.removeEntryAttachment(
          fixture.context,
          fixture.company.id,
          imported.draftEntryId,
          manualAttachment.id,
        );

        assert.equal(cleanedEntry.attachments.length, 1);
        assert.equal(cleanedEntry.attachments[0].documentType, "XML_NFE");

        await assert.rejects(() => access(manualAttachmentPath));
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

  const account = await prisma.financialAccount.create({
    data: {
      companyId: company.id,
      name: `Conta ${suffix}`,
      type: "CASH",
      initialBalance: 0,
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
    account,
    inventoryService,
    context: {
      companyId: company.id,
      userId: user.id,
      isPlatformAdmin: false,
      permissions: [
        PERMISSIONS.inventoryCreate,
        PERMISSIONS.inventoryUpdate,
        PERMISSIONS.inventoryView,
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
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      unit: input.unit ?? "un",
      type: input.type,
      controlsStock: true,
      showOnWebsite: false,
      costPrice: 0,
      salePrice: input.salePrice ?? 20,
      minimumStock: 0,
      currentStock: 0,
      isActive: true,
    },
  });
}

async function getStockSnapshot(productId) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      stockLayers: true,
    },
  });

  return {
    currentStock: toNumber(product.currentStock),
    fifoAvailable: roundQuantity(
      product.stockLayers.reduce((sum, layer) => sum + toNumber(layer.availableQuantity), 0),
    ),
    layers: product.stockLayers.length,
  };
}

async function cleanupFixture(companyId, userId) {
  const inventoryEntryIds = (
    await prisma.inventoryEntry.findMany({
      where: { companyId },
      select: { id: true },
    })
  ).map((entry) => entry.id);

  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.financialEntryItem.deleteMany({
    where: {
      entry: {
        companyId,
      },
    },
  });
  await prisma.financialEntry.deleteMany({ where: { companyId } });
  await prisma.productPriceHistory.deleteMany({ where: { companyId } });
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

  await prisma.$executeRawUnsafe(
    `DELETE FROM operational_document_attachments WHERE company_id = $1::uuid`,
    companyId,
  );
    await prisma.$executeRawUnsafe(
      `DELETE FROM supplier_item_mappings WHERE company_id = $1::uuid`,
      companyId,
    );
    await prisma.supplier.deleteMany({ where: { companyId } });

    await prisma.inventoryEntry.deleteMany({ where: { companyId } });
  await prisma.companyOperationalSetting.deleteMany({ where: { companyId } });
  await prisma.financialAccount.deleteMany({ where: { companyId } });
  await prisma.product.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  await rm(
    path.join(process.cwd(), "storage", "operational-documents", companyId),
    { recursive: true, force: true },
  );
}

function buildXml({ number, accessKey, supplierName, supplierDocument, items }) {
  const total = items
    .reduce((sum, item) => sum + Number.parseFloat(item.totalPrice), 0)
    .toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe${accessKey}">
      <ide>
        <natOp>Compra de mercadoria</natOp>
        <serie>1</serie>
        <nNF>${number}</nNF>
        <dhEmi>2026-06-29T12:00:00-03:00</dhEmi>
        <dhSaiEnt>2026-06-29T12:30:00-03:00</dhSaiEnt>
      </ide>
      <emit>
        <CNPJ>${supplierDocument}</CNPJ>
        <xNome>${supplierName}</xNome>
      </emit>
      ${items
        .map(
          (item) => `
      <det nItem="${item.lineNumber}">
        <prod>
          <cProd>${item.code}</cProd>
          <cEAN>${item.ean}</cEAN>
          <xProd>${item.description}</xProd>
          <NCM>${item.ncm}</NCM>
          <CFOP>${item.cfop}</CFOP>
          <uCom>${item.unit}</uCom>
          <qCom>${item.quantity}</qCom>
          <vUnCom>${item.unitPrice}</vUnCom>
          <vProd>${item.totalPrice}</vProd>
        </prod>
      </det>`,
        )
        .join("")}
      <total>
        <ICMSTot>
          <vProd>${total}</vProd>
          <vFrete>0.00</vFrete>
          <vDesc>0.00</vDesc>
          <vNF>${total}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>${accessKey}</chNFe>
      <nProt>135260000123456</nProt>
    </infProt>
  </protNFe>
</nfeProc>`;
}

function uniqueLabel(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function roundQuantity(value) {
  return Math.round(value * 1000) / 1000;
}
