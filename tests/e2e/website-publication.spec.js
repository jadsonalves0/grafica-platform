import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  expectNoCriticalViolations,
  openAdminRoute,
  uniqueName,
} from "./helpers/session";

test("configuracao guiada e publicacao do website", async ({ page }) => {
  await authenticateAsAdmin(page);
  await openAdminRoute(page, "/admin/site", "Website");

  const serviceName = uniqueName("Servico publicado");

  await page.getByRole("tab", { name: "3. Servicos" }).click();
  await page.getByLabel("Nome do servico").fill(serviceName);
  await page.getByLabel("Descricao curta").fill(
    "Servico criado durante a validacao automatizada.",
  );
  await page.getByRole("button", { name: /Adicionar servico|Salvar servico/ }).click();

  await page.getByRole("tab", { name: "5. Revisar e publicar" }).click();
  await page.getByLabel(/Publicar site para uso comercial/i).check();
  await page
    .getByRole("button", { name: /Salvar configuracao|Salvar e manter publicado/ })
    .click();

  await expect(page.getByText("Status do site")).toBeVisible();
  await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible();
  await expectNoCriticalViolations(page, AxeBuilder);
});
