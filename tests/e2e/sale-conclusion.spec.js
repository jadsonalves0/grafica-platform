import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
  pickSearchableOption,
  pickFirstSearchableOption,
  uniqueName,
} from "./helpers/session";

async function createServiceItem(page, name) {
  await openAdminRoute(page, "/admin/estoque/novo", "Novo item");
  await page.getByLabel("Nome do item").fill(name);
  await page.getByLabel("Tipo").selectOption("SERVICE");
  await page.getByLabel("Unidade").fill("sv");
  await page.getByLabel("Preco de venda atual (R$)").fill("30,00");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page).toHaveURL(/\/admin\/estoque/);
}

async function createPhysicalItem(page, name) {
  await openAdminRoute(page, "/admin/estoque/novo", "Novo item");
  await page.getByLabel("Nome do item").fill(name);
  await page.getByLabel("Tipo").selectOption("RESALE");
  await page.getByLabel("Unidade").fill("un");
  await page.getByLabel("Preco de venda atual (R$)").fill("30,00");
  await page.getByLabel("Custo de referencia (R$)").fill("18,00");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page).toHaveURL(/\/admin\/estoque/);
}

async function confirmStockEntry(page, itemName, documentNumber) {
  await openAdminRoute(page, "/admin/estoque/entradas/novo", "Nova entrada");
  await page.getByLabel("Tipo da entrada").selectOption("PURCHASE_WITHOUT_INVOICE");
  await page.getByLabel("Numero do documento").fill(documentNumber);
  await page.getByRole("button", { name: "Continuar" }).click();

  await pickSearchableOption(page, "Item cadastrado", itemName);
  await page.getByLabel("Quantidade").fill("5");
  await page.getByLabel("Custo unitario").fill("18,00");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Salvar entrada" }).click();

  await expect(page).toHaveURL(/\/admin\/estoque\/entradas/);
  await page
    .locator("article")
    .filter({ hasText: documentNumber })
    .getByRole("link", { name: "Abrir entrada" })
    .click();
  await page.getByRole("button", { name: "Confirmar entrada" }).click();
  await expect(page).toHaveURL(/feedback=entry-confirmed/);
}

test("venda concluida a partir da tela propria de vendas", async ({ page }) => {
  await authenticateAsAdmin(page);

  const itemName = uniqueName("Servico venda e2e");

  await createServiceItem(page, itemName);
  await openAdminRoute(page, "/admin/vendas/novo", "Nova venda");

  await pickFirstSearchableOption(page, "Conta financeira");
  await pickFirstSearchableOption(page, "Categoria financeira");
  await page.getByLabel("Buscar item").fill(itemName);
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await page.getByLabel("Quantidade").first().fill("1");
  const saveButton = page.getByRole("button", { name: "Concluir venda" });
  await saveButton.scrollIntoViewIfNeeded();
  await page.getByLabel("Observacao adicional").blur();
  await saveButton.click();

  await expect(page.getByRole("heading", { name: "Venda concluida" })).toBeVisible();
  await expect(page.getByText("Situacao financeira")).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir venda" })).toBeVisible();
  await expectNoCriticalViolations(page, AxeBuilder);
});

test("venda com item fisico reduz o saldo em estoque", async ({ page }) => {
  await authenticateAsAdmin(page);

  const itemName = uniqueName("Revenda venda e2e");
  const documentNumber = `SALE-E2E-${Date.now()}`;

  await createPhysicalItem(page, itemName);
  await confirmStockEntry(page, itemName, documentNumber);

  await openAdminRoute(page, "/admin/vendas/novo", "Nova venda");
  await pickFirstSearchableOption(page, "Conta financeira");
  await pickFirstSearchableOption(page, "Categoria financeira");
  await page.getByLabel("Buscar item").fill(itemName);
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await page.getByLabel("Quantidade").first().fill("2");
  await page.getByRole("button", { name: "Concluir venda" }).click();

  await expect(page.getByRole("heading", { name: "Venda concluida" })).toBeVisible();
  await expect(page.getByText("estoque dos itens fisicos", { exact: false })).toBeVisible();

  await openAdminRoute(page, "/admin/estoque/posicao", "Estoque");
  await page.getByLabel("Buscar por nome, SKU ou EAN/GTIN").fill(itemName);

  const stockCard = page.locator("article").filter({ hasText: itemName }).first();
  await expect(stockCard).toBeVisible();
  await expect(stockCard).toContainText("Saldo atual");
  await expect(stockCard).toContainText("3 un");
});
