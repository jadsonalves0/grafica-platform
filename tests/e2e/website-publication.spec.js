import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  authenticateAsAdmin,
  credentials,
  expectNoCriticalViolations,
  openAdminRoute,
  uniqueName,
} from "./helpers/session";

test("configura home comercial, revisa previa e publica o website", async ({ page }, testInfo) => {
  await authenticateAsAdmin(page);
  await openAdminRoute(page, "/admin/site", "Website");

  const serviceName = uniqueName("Servico website");
  const heroTitle = uniqueName("Impressao profissional");

  await page.getByRole("tab", { name: "2. Pagina inicial" }).click();
  await page.getByLabel("Titulo do hero").fill(heroTitle);
  await page.getByLabel("Subtitulo do hero").fill(
    "Materiais graficos para empresas, eventos e comunicacao visual com atendimento agil.",
  );
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText(/rascunho do website salvo com sucesso/i)).toBeVisible();

  await page.getByRole("tab", { name: "3. Servicos" }).click();
  await page.getByLabel("Nome do servico").fill(serviceName);
  await page.getByLabel("Descricao curta").fill(
    "Servico criado durante a validacao automatizada do website.",
  );
  await page.getByRole("button", { name: /Adicionar servico|Salvar servico/ }).click();

  await page.getByRole("tab", { name: "4. Contato" }).click();
  await page.getByLabel("WhatsApp").fill("(11) 99999-1111");
  await page.getByLabel("E-mail comercial").fill("website@pontoprint.local");
  await page.getByLabel("Mapa incorporado").fill("https://www.google.com/maps/embed?pb=teste");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText(/Existem alteracoes salvas que ainda nao foram publicadas/i)).toBeVisible();

  await page.getByRole("tab", { name: "Desktop" }).click();
  await page.screenshot({ path: testInfo.outputPath("website-preview-desktop.png"), fullPage: false });
  await page.getByRole("tab", { name: "Mobile" }).click();
  await page.screenshot({ path: testInfo.outputPath("website-preview-mobile.png"), fullPage: false });

  await page.getByRole("tab", { name: "5. Revisar e publicar" }).click();
  await page.getByRole("button", { name: "Publicar alteracoes" }).click();
  await expect(page.getByText(/website publicado com sucesso/i)).toBeVisible();

  await page.goto(`/${credentials.company}?utm_source=google&utm_medium=cpc&utm_campaign=inverno`);
  await expect(page.getByRole("heading", { name: new RegExp(heroTitle, "i") })).toBeVisible();
  await expect(page.getByRole("link", { name: /Falar pelo WhatsApp/i }).first()).toBeVisible();
  await expect(page.locator('iframe[title*="Mapa da"]')).toBeVisible();
  await expectNoCriticalViolations(page, AxeBuilder);
  await page.screenshot({ path: testInfo.outputPath("website-home-desktop.png"), fullPage: true });

  await page
    .locator("article", { hasText: serviceName })
    .getByRole("link", { name: "Solicitar orcamento" })
    .click();
  await expect(page.getByLabel("Servico desejado")).toHaveValue(new RegExp(serviceName, "i"));
  await page.getByLabel("Nome").fill("Lead teste website");
  await page.getByLabel("WhatsApp").fill("(11) 99999-2222");
  await page.getByLabel("Mensagem").fill("Preciso de um orcamento com prazo e quantidade.");
  await page.getByRole("button", { name: /Solicitar orcamento/i }).click();
  await expect(page.getByText(/Solicitacao enviada com sucesso/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("website-lead-success.png"), fullPage: false });

  await authenticateAsAdmin(page);
  await openAdminRoute(page, "/admin/site/leads", "Leads do site");
  await expect(page.getByText("Lead teste website")).toBeVisible();
  await expect(page.getByText(serviceName)).toBeVisible();
  await expect(page.getByText("Website")).toBeVisible();
  await expect(page.getByText("/ponto-print?utm_source=google&utm_medium=cpc&utm_campaign=inverno")).toBeVisible();
  await expect(page.getByText("google / cpc / inverno")).toBeVisible();
  await expectNoCriticalViolations(page, AxeBuilder);
});

test("oculta CTA de WhatsApp quando o canal nao estiver configurado", async ({ page }) => {
  await authenticateAsAdmin(page);
  await openAdminRoute(page, "/admin/site", "Website");

  await page.getByRole("tab", { name: "4. Contato" }).click();
  await page.getByLabel("WhatsApp").fill("");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await page.getByRole("tab", { name: "5. Revisar e publicar" }).click();
  await page.getByRole("button", { name: "Publicar alteracoes" }).click();

  await page.goto(`/${credentials.company}`);
  await expect(page.getByRole("link", { name: /Falar pelo WhatsApp/i })).toHaveCount(0);
});
