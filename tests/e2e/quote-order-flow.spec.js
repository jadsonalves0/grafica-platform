import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
  pickSearchableOption,
  uniqueName,
} from "./helpers/session";

async function createCatalogItem(page, name) {
  await openAdminRoute(page, "/admin/estoque/novo", "Novo item");
  await page.getByLabel("Nome do item").fill(name);
  await page.getByLabel("Tipo").selectOption("SERVICE");
  await page.getByLabel("Unidade").fill("sv");
  await page.getByLabel("Preco de venda atual (R$)").fill("45,00");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page).toHaveURL(/\/admin\/estoque/);
}

test("orcamento aprovado vira pedido entregue e faturado sem abrir a tela de vendas", async ({ page }) => {
  await authenticateAsAdmin(page);

  const itemName = uniqueName("Item quote-order");

  await createCatalogItem(page, itemName);

  await openAdminRoute(page, "/admin/orcamentos/novo", "Novo orcamento");
  await pickSearchableOption(page, "Cliente", "Cliente teste numero 3");

  const quoteItemLookup = page.getByRole("combobox", { name: /Item cadastrado 1/i }).first();
  await expect(quoteItemLookup).toHaveAttribute("autocomplete", "off");
  await expect(quoteItemLookup).toHaveAttribute("name", "quoteItemSearch-1");

  await pickSearchableOption(page, "Item cadastrado 1", itemName);
  await page.getByLabel("Quantidade").first().fill("2");
  await page.getByLabel("Valor unitario").first().fill("45,00");
  await page.getByRole("button", { name: "Salvar orcamento" }).click();

  await expect(page).toHaveURL(/\/admin\/orcamentos\/.+/, { timeout: 30_000 });
  await expect(page.getByText("Cliente teste numero 3")).toBeVisible();
  await page.getByRole("button", { name: "Cliente aprovou proposta" }).click();
  await expect(page.getByText("aprovado com sucesso", { exact: false })).toBeVisible({ timeout: 30_000 });

  const quoteHeading = await page.getByRole("heading").first().textContent();
  const quoteCodeMatch = quoteHeading?.match(/ORC-\d+/i);
  expect(quoteCodeMatch?.[0]).toBeTruthy();
  const quoteCode = quoteCodeMatch[0];

  await openAdminRoute(page, "/admin/pedidos/novo", "Novo pedido");
  await pickSearchableOption(page, "Orcamento aprovado", quoteCode);
  await page.getByRole("button", { name: "Salvar pedido" }).click();

  await expect(page).toHaveURL(/\/admin\/pedidos\/.+/, { timeout: 30_000 });
  await expect(page.getByText("Cliente teste numero 3")).toBeVisible();

  await page.getByLabel("Status de producao").selectOption("DELIVERED");
  await page.getByRole("button", { name: "Atualizar andamento" }).click();

  await expect(page.getByText("Andamento atualizado com sucesso.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Faturar pedido" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Entregue")).toBeVisible();

  await page.getByRole("button", { name: "Faturar pedido" }).click();

  await expect(page.getByText("faturado com sucesso", { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Abrir venda" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir conta a receber" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Faturar pedido" })).toHaveCount(0);

  await expectNoCriticalViolations(page, AxeBuilder);
});
