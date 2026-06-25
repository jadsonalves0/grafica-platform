import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
} from "./helpers/session";

async function expandSidebarGroup(page, name) {
  const button = page.getByRole("button", { name: new RegExp(`^${name}`, "i") }).first();
  await expect(button).toBeVisible();
  const expanded = await button.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await button.click();
  }
}

test("financeiro muda o conteudo por opcao e o menu reposiciona cadastros", async ({ page }) => {
  await authenticateAsAdmin(page);

  await openAdminRoute(page, "/admin/financeiro", "Visao financeira");
  await expect(page.getByText("Pedidos prontos para faturamento")).toBeVisible();

  await expandSidebarGroup(page, "Financeiro");
  await page.getByRole("link", { name: "Contas a receber" }).click();
  await expect(page).toHaveURL(/view=receivable/);
  await expect(page.getByRole("heading", { name: "Contas a receber" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contas a pagar" })).toHaveCount(0);

  await expandSidebarGroup(page, "Financeiro");
  await page.getByRole("link", { name: "Contas a pagar" }).click();
  await expect(page).toHaveURL(/view=payable/);
  await expect(page.getByRole("heading", { name: "Contas a pagar" })).toBeVisible();
  await expect(page.getByText("Contas a receber")).toHaveCount(0);

  await expandSidebarGroup(page, "Financeiro");
  await page.getByRole("link", { name: "Lancamentos manuais" }).click();
  await expect(page).toHaveURL(/view=manual/);
  await expect(page.getByRole("heading", { name: "Lancamentos manuais" })).toBeVisible();
  await page.getByRole("link", { name: "Novo lancamento manual" }).click();

  await expect(page).toHaveURL(/\/admin\/financeiro\/lancamentos\/novo/);
  await expect(page.getByRole("heading", { name: "Lancamento manual" })).toBeVisible();
  await expect(page.getByLabel("Conta financeira")).toBeVisible();
  await expect(page.getByLabel("Categoria")).toBeVisible();
  await expect(page.getByLabel("Valor")).toBeVisible();

  await openAdminRoute(page, "/dashboard", "Central de trabalho");
  await expandSidebarGroup(page, "Cadastros");
  await expect(page.getByRole("link", { name: "Produtos e servicos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Grupos de itens" })).toBeVisible();

  await expandSidebarGroup(page, "Configuracoes");
  await expect(page.getByRole("link", { name: "Produtos e servicos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Grupos de itens" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Empresa" })).toBeVisible();

  await expectNoCriticalViolations(page, AxeBuilder);
});
