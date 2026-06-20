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

test("movimentacao permite trocar o item selecionado", async ({ page }) => {
  await authenticateAsAdmin(page);

  const itemA = uniqueName("Mov item A");
  const itemB = uniqueName("Mov item B");

  await createStockItem(page, itemA);
  await createStockItem(page, itemB);

  await openAdminRoute(page, "/admin/estoque/movimentar", "Movimentacoes");
  await expect(page.getByRole("link", { name: "Abrir item" })).toHaveCount(0);

  await pickSearchableOption(page, "Item", itemA);
  await expect(page.getByText(itemA).first()).toBeVisible();

  await pickSearchableOption(page, "Item", itemB);
  await expect(page.getByText(itemB).first()).toBeVisible();

  await page.getByLabel("Quantidade").fill("2");
  await page.getByLabel("Custo unitario").fill("7,50");
  await page.getByLabel("Motivo detalhado").fill("Ajuste validado pelo teste automatizado.");
  await page.getByRole("button", { name: "Registrar movimentacao" }).click();

  await expect(page.getByText("Movimentacao registrada com sucesso.")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: itemB }).first()).toBeVisible();
  await expectNoCriticalViolations(page, AxeBuilder);
});
