import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  expectNoCriticalViolations,
  loginAsAdmin,
} from "./helpers/session";

test("login administrativo e shell principal", async ({ page }, testInfo) => {
  await loginAsAdmin(page);

  await expect(
    page.getByRole("heading", { name: "Central de trabalho" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Nova venda" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar despesa" })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;

  if (viewportWidth > 1024) {
    const topbarMenuButton = page.getByRole("button", { name: "Abrir navegacao" });
    await expect(topbarMenuButton).toBeHidden();
    await expect(page.locator(".admin-top-nav").getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".admin-topbar__utility").getByRole("link", { name: "Cadastros" })).toBeVisible();
    await expect(page.locator(".admin-topbar__utility").getByRole("link", { name: "Configuracoes" })).toBeVisible();

    const sidebar = page.locator(".admin-sidebar");
    const expandedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    expect(expandedWidth).toBeGreaterThanOrEqual(240);
    expect(expandedWidth).toBeLessThanOrEqual(256);

    const collapseButton = page.getByRole("button", { name: "Recolher menu lateral" });
    await collapseButton.click();

    const collapsedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    expect(collapsedWidth).toBeGreaterThanOrEqual(64);
    expect(collapsedWidth).toBeLessThanOrEqual(72);

    const compactRegistriesLink = page.locator(".admin-sidebar__compact-nav").getByRole("link", { name: "Cadastros" });
    await expect(compactRegistriesLink).toBeVisible();
    await compactRegistriesLink.hover();
    await expect(page.locator(".admin-sidebar__tooltip", { hasText: "Cadastros" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Expandir menu lateral" })).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("shell-collapsed-desktop.png"), fullPage: false });

    await page.reload();
    const persistedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    expect(persistedWidth).toBeGreaterThanOrEqual(64);
    expect(persistedWidth).toBeLessThanOrEqual(72);

    await page.getByRole("button", { name: "Expandir menu lateral" }).click();
    await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("shell-expanded-desktop.png"), fullPage: false });
  } else {
    const menuButton = page.getByRole("button", { name: "Abrir navegacao" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText("Meu site")).toBeVisible();
    await expect(drawer.getByText("Cadastros")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("shell-mobile-drawer.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
  }

  await expectNoCriticalViolations(page, AxeBuilder);
});
