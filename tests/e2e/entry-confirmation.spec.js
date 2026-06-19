import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
  pickSearchableOption,
  uniqueName,
} from "./helpers/session";

async function createStockItem(page, name) {
  await openAdminRoute(page, "/admin/estoque/novo", "Novo item");
  await page.getByLabel("Nome do item").fill(name);
  await page.getByLabel("Tipo").selectOption("RAW_MATERIAL");
  await page.getByLabel("Unidade").fill("un");
  await page.getByLabel("Preco de venda atual (R$)").fill("12,00");
  await page.getByLabel("Custo de referencia (R$)").fill("8,00");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page).toHaveURL(/\/admin\/estoque/);
}

test("entrada salva e confirmada", async ({ page }) => {
  await authenticateAsAdmin(page);

  const itemName = uniqueName("Materia prima e2e");
  const documentNumber = `E2E-${Date.now()}`;

  await createStockItem(page, itemName);
  await openAdminRoute(page, "/admin/estoque/entradas/novo", "Nova entrada");

  await page
    .getByLabel("Tipo da entrada")
    .selectOption("PURCHASE_WITHOUT_INVOICE");
  await page.getByLabel("Numero do documento").fill(documentNumber);
  await page.getByRole("button", { name: "Continuar" }).click();

  await pickSearchableOption(page, "Item cadastrado", itemName);
  await page.getByLabel("Quantidade").fill("10");
  await page.getByLabel("Custo unitario").fill("8,00");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Salvar entrada" }).click();

  await expect(page).toHaveURL(/\/admin\/estoque\/entradas/);
  await expect(page.getByText(documentNumber)).toBeVisible();
  await page
    .locator("article")
    .filter({ hasText: documentNumber })
    .getByRole("link", { name: "Abrir entrada" })
    .click();
  await page.getByRole("button", { name: "Confirmar entrada" }).click();

  await expect(page).toHaveURL(/feedback=entry-confirmed/);
  await expectNoCriticalViolations(page, AxeBuilder);
});
