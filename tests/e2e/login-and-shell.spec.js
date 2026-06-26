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
    await expect(page.locator(".admin-sidebar")).toHaveCount(0);

    const registriesMenu = page.locator(".admin-utility-menu").filter({ hasText: "Cadastros" });
    await expect(registriesMenu.locator(".admin-utility-menu__summary")).toBeVisible();
    await registriesMenu.locator(".admin-utility-menu__summary").click();
    await expect(registriesMenu.getByRole("menuitem", { name: "Produtos e servicos" })).toBeVisible();

    const settingsMenu = page.locator(".admin-utility-menu").filter({ hasText: "Configuracoes" });
    await expect(settingsMenu.locator(".admin-utility-menu__summary")).toBeVisible();
    await settingsMenu.locator(".admin-utility-menu__summary").click();
    await expect(settingsMenu.getByRole("menuitem", { name: "Empresa" })).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("shell-desktop-topnav.png"), fullPage: false });
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
