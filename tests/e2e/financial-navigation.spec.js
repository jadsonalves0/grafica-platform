import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { authenticateAsAdmin, expectNoCriticalViolations, openAdminRoute } from "./helpers/session";

async function openDrawerIfNeeded(page) {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth > 1024) {
    return false;
  }

  await page.getByRole("button", { name: "Abrir navegacao" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return true;
}

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

  const isMobile = (page.viewportSize()?.width ?? 0) <= 1024;
  if (isMobile) {
    await openDrawerIfNeeded(page);
    await expandSidebarGroup(page, "Financeiro");
    await page.getByRole("link", { name: "Contas a receber" }).click();
  } else {
    const moduleTabs = page.locator(".admin-module-tabs");
    await moduleTabs.getByRole("link", { name: "Contas a receber" }).click();
  }
  await expect(page).toHaveURL(/view=receivable/);
  await expect(page.getByRole("heading", { name: "Contas a receber" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contas a pagar" })).toHaveCount(0);

  if (isMobile) {
    await openDrawerIfNeeded(page);
    await expandSidebarGroup(page, "Financeiro");
    await page.getByRole("link", { name: "Contas a pagar" }).click();
  } else {
    await page.locator(".admin-module-tabs").getByRole("link", { name: "Contas a pagar" }).click();
  }
  await expect(page).toHaveURL(/view=payable/);
  await expect(page.getByRole("heading", { name: "Contas a pagar" })).toBeVisible();
  await expect(page.getByText("Contas a receber")).toHaveCount(0);

  if (isMobile) {
    await openDrawerIfNeeded(page);
    await expandSidebarGroup(page, "Financeiro");
    await page.getByRole("link", { name: "Lancamentos manuais" }).click();
  } else {
    await page.locator(".admin-module-tabs").getByRole("link", { name: "Lancamentos manuais" }).click();
  }
  await expect(page).toHaveURL(/view=manual/);
  await expect(page.getByRole("heading", { name: "Lancamentos manuais" })).toBeVisible();
  await page.getByRole("link", { name: "Novo lancamento manual" }).click();

  await expect(page).toHaveURL(/\/admin\/financeiro\/lancamentos\/novo/);
  await expect(page.getByRole("heading", { name: "Lancamento manual" })).toBeVisible();
  await expect(page.getByLabel("Conta financeira")).toBeVisible();
  await expect(page.getByLabel("Categoria")).toBeVisible();
  await expect(page.getByLabel("Valor")).toBeVisible();

  if (isMobile) {
    await openDrawerIfNeeded(page);
    await expandSidebarGroup(page, "Cadastros");
    await page.getByRole("link", { name: "Produtos e servicos" }).click();
  } else {
    await page.locator(".admin-topbar__utility").getByRole("link", { name: "Cadastros" }).click();
  }
  await expect(page).toHaveURL(/\/admin\/estoque/);
  if (!isMobile) {
    await expect(page.locator(".admin-module-tabs").getByRole("link", { name: "Produtos e servicos" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".admin-module-tabs").getByRole("link", { name: "Grupos de itens" })).toBeVisible();
  }

  if (isMobile) {
    await openDrawerIfNeeded(page);
    await expandSidebarGroup(page, "Configuracoes");
    await page.getByRole("link", { name: "Empresa" }).click();
    await expect(page).toHaveURL(/\/admin\/empresa/);
  } else {
    await page.locator(".admin-topbar__utility").getByRole("link", { name: "Configuracoes" }).click();
    await expect(page.locator(".admin-module-tabs").getByRole("link", { name: "Empresa" })).toBeVisible();
    await expect(page.locator(".admin-module-tabs").getByRole("link", { name: "Produtos e servicos" })).toHaveCount(0);
    await expect(page.locator(".admin-module-tabs").getByRole("link", { name: "Grupos de itens" })).toHaveCount(0);
  }

  await expectNoCriticalViolations(page, AxeBuilder);
});
