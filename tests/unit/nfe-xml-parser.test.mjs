import assert from "node:assert/strict";

import { parseNfeXml } from "../../src/lib/inventory/nfe-xml-parser.ts";

export const cases = [
  {
    name: "interpreta os principais dados da NF-e e dos itens",
    async run() {
      const xml = buildXml({
        number: "12345",
        accessKey: "35260612345678000123550010000123451000123456",
        supplierName: "Fornecedor Teste",
        supplierDocument: "12345678000123",
        items: [
          {
            lineNumber: 1,
            code: "PAP-001",
            description: "Papel Couchê 300g",
            ean: "7891234567890",
            ncm: "48119090",
            cfop: "1102",
            unit: "un",
            quantity: "2.0000",
            unitPrice: "10.50",
            totalPrice: "21.00",
          },
        ],
      });

      const parsed = parseNfeXml(xml);

      assert.equal(parsed.accessKey, "35260612345678000123550010000123451000123456");
      assert.equal(parsed.number, "12345");
      assert.equal(parsed.series, "1");
      assert.equal(parsed.supplierName, "Fornecedor Teste");
      assert.equal(parsed.supplierDocument, "12345678000123");
      assert.equal(parsed.totalAmount, 21);
      assert.equal(parsed.items.length, 1);
      assert.equal(parsed.items[0].lineNumber, 1);
      assert.equal(parsed.items[0].supplierProductCode, "PAP-001");
      assert.equal(parsed.items[0].description, "Papel Couchê 300g");
      assert.equal(parsed.items[0].ean, "7891234567890");
      assert.equal(parsed.items[0].ncm, "48119090");
      assert.equal(parsed.items[0].cfop, "1102");
      assert.equal(parsed.items[0].quantity, 2);
      assert.equal(parsed.items[0].unitPrice, 10.5);
      assert.equal(parsed.items[0].totalPrice, 21);
    },
  },
  {
    name: "rejeita conteudo que nao e um XML valido de NF-e",
    async run() {
      assert.throws(
        () => parseNfeXml("conteudo invalido"),
        /Nao foi possivel ler o XML informado/i,
      );
    },
  },
];

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
