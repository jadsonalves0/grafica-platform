import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
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
