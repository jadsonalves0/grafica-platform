import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
} from "./helpers/session";

test("pedidos usa layout compacto sem redundancia de titulo", async ({ page }, testInfo) => {
  await authenticateAsAdmin(page);
  await openAdminRoute(page, "/admin/pedidos", "Pedidos");

  await expect(page.locator(".admin-topbar__title")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pedidos" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Novo pedido" })).toBeVisible();
  await expect(page.getByLabel("Buscar pedido ou cliente")).toBeVisible();
  await expect(page.getByLabel("Status comercial")).toBeVisible();
  await expect(page.getByLabel("Producao")).toBeVisible();

  const firstCard = page.locator(".admin-list-card").first();
  await expect(firstCard).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalScroll).toBeFalsy();

  if (viewportWidth > 1024) {
    await expect(page.locator(".admin-sidebar")).toHaveCount(0);
    await expect(page.locator(".admin-module-tabs").getByRole("link", { name: "Pedidos" })).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: testInfo.outputPath("pedidos-desktop-topnav.png"), fullPage: false });
  } else {
    await page.screenshot({ path: testInfo.outputPath("pedidos-mobile-360.png"), fullPage: true });
  }

  const searchField = page.getByLabel("Buscar pedido ou cliente");
  await searchField.fill(`sem-resultados-${Date.now()}`);
  await expect(page.getByText("Nenhum pedido encontrado")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("pedidos-empty-state.png"), fullPage: false });

  await expectNoCriticalViolations(page, AxeBuilder);
});
