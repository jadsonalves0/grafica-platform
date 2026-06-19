import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
  uniqueName,
} from "./helpers/session";

test("cadastro de item operacional", async ({ page }) => {
  await authenticateAsAdmin(page);
  await openAdminRoute(page, "/admin/estoque/novo", "Novo item");

  const itemName = uniqueName("Servico teste");

  await page.getByLabel("Nome do item").fill(itemName);
  await page.getByLabel("Tipo").selectOption("SERVICE");
  await page.getByLabel("Unidade").fill("sv");
  await page.getByLabel("Preco de venda atual (R$)").fill("25,00");
  await page.getByRole("button", { name: "Salvar item" }).click();

  await expect(page).toHaveURL(/\/admin\/estoque/);
  await expect(page.getByText(itemName)).toBeVisible();
  await expectNoCriticalViolations(page, AxeBuilder);
});
