import { expect } from "@playwright/test";

export const credentials = {
  company: process.env.E2E_COMPANY ?? "ponto-print",
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@pontoprint.local",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Trocar123!",
};

export async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.locator('form[data-ui-ready="true"]').waitFor({ timeout: 30_000 });
  await page.getByLabel("Empresa").fill(credentials.company);
  await page.getByLabel("E-mail").fill(credentials.email);
  await page.getByLabel("Senha").fill(credentials.password);
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  const loginResponse = await loginResponsePromise;
  const loginResult = await loginResponse.json().catch(() => null);

  expect(
    loginResponse.ok(),
    loginResult?.message ?? "Nao foi possivel autenticar pela tela de login.",
  ).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Central de trabalho/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function authenticateAsAdmin(page) {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: {
      companySlug: credentials.company,
      email: credentials.email,
      password: credentials.password,
    },
  });

  const loginResult = await loginResponse.json().catch(() => null);

  expect(
    loginResponse.ok(),
    loginResult?.message ?? "Nao foi possivel autenticar pela API para preparar o teste.",
  ).toBeTruthy();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Central de trabalho/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function openAdminRoute(page, path, heading) {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegex(heading), "i") }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function pickSearchableOption(page, label, query) {
  const input = page
    .getByRole("combobox", { name: new RegExp(escapeRegex(label), "i") })
    .first();
  await expect(input).toBeEnabled({ timeout: 20_000 });
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  await input.fill(query);
  const option = page
    .locator('[role="listbox"] button')
    .filter({ hasText: new RegExp(escapeRegex(query), "i") })
    .first();
  await expect(option).toBeVisible({ timeout: 20_000 });
  await option.click();
}

export async function pickFirstSearchableOption(page, label) {
  const input = page
    .getByRole("combobox", { name: new RegExp(escapeRegex(label), "i") })
    .first();
  await expect(input).toBeEnabled({ timeout: 20_000 });
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  const option = page.locator('[role="listbox"] button').first();
  await expect(option).toBeVisible({ timeout: 20_000 });
  await option.click();
}

export async function expectNoCriticalViolations(page, AxeBuilder) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();

  const severeViolations = accessibilityScanResults.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );

  expect(
    severeViolations,
    severeViolations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);
}

export function uniqueName(prefix) {
  return `${prefix} ${Date.now()}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
