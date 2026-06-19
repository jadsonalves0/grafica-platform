"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  Field,
  LoadingButton,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StickyActionBar,
} from "@/components/admin/ui";
import { normalizeDecimalInput, parseDecimalInput } from "@/lib/forms/br-utils";

type OperationalSettings = {
  companyId: string;
  defaultMarginPercent: number;
  minimumMarginPercent: number;
  costVariationAlertPercent: number;
  regularDiscountLimitPercent: number;
  managerDiscountLimitPercent: number;
  allowNegativeStock: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type FormState = {
  defaultMarginPercent: string;
  minimumMarginPercent: string;
  costVariationAlertPercent: string;
  regularDiscountLimitPercent: string;
  managerDiscountLimitPercent: string;
  allowNegativeStock: boolean;
};

export default function ParametrosPage() {
  const [form, setForm] = useState<FormState>({
    defaultMarginPercent: "30",
    minimumMarginPercent: "10",
    costVariationAlertPercent: "10",
    regularDiscountLimitPercent: "5",
    managerDiscountLimitPercent: "15",
    allowNegativeStock: false,
  });
  const [metadata, setMetadata] = useState<{ createdAt?: string; updatedAt?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/inventory/settings", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<OperationalSettings>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os parametros.");
          return;
        }

        setForm({
          defaultMarginPercent: formatDecimal(result.data.defaultMarginPercent),
          minimumMarginPercent: formatDecimal(result.data.minimumMarginPercent),
          costVariationAlertPercent: formatDecimal(result.data.costVariationAlertPercent),
          regularDiscountLimitPercent: formatDecimal(result.data.regularDiscountLimitPercent),
          managerDiscountLimitPercent: formatDecimal(result.data.managerDiscountLimitPercent),
          allowNegativeStock: result.data.allowNegativeStock,
        });
        setMetadata({
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setErrorMessage("Falha ao consultar os parametros.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    const values = [
      parseDecimalInput(form.defaultMarginPercent),
      parseDecimalInput(form.minimumMarginPercent),
      parseDecimalInput(form.costVariationAlertPercent),
      parseDecimalInput(form.regularDiscountLimitPercent),
      parseDecimalInput(form.managerDiscountLimitPercent),
    ];

    if (values.some((value) => value < 0 || value >= 100)) {
      return "Informe percentuais validos entre 0 e 99,99.";
    }

    if (parseDecimalInput(form.minimumMarginPercent) > parseDecimalInput(form.defaultMarginPercent)) {
      return "A margem minima nao pode ser maior que a margem desejada.";
    }

    if (parseDecimalInput(form.regularDiscountLimitPercent) > parseDecimalInput(form.managerDiscountLimitPercent)) {
      return "O limite do usuario comum nao pode ser maior que o do gerente.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/inventory/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          defaultMarginPercent: parseDecimalInput(form.defaultMarginPercent),
          minimumMarginPercent: parseDecimalInput(form.minimumMarginPercent),
          costVariationAlertPercent: parseDecimalInput(form.costVariationAlertPercent),
          regularDiscountLimitPercent: parseDecimalInput(form.regularDiscountLimitPercent),
          managerDiscountLimitPercent: parseDecimalInput(form.managerDiscountLimitPercent),
          allowNegativeStock: form.allowNegativeStock,
        }),
      });
      const result = (await response.json()) as ApiResult<OperationalSettings>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar os parametros.");
        return;
      }

      setMetadata({
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      });
      setSuccessMessage("Parametros operacionais atualizados com sucesso.");
    } catch {
      setErrorMessage("Falha ao salvar os parametros.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--medium">
      <PageHeader
        breadcrumbs={[{ label: "Administracao" }, { label: "Parametros" }]}
        title="Parametros"
        description="Defina margens, limites de desconto e politica de estoque negativo para orientar as operacoes."
      />

      {isLoading ? (
        <SectionCard title="Carregando parametros operacionais">
          <Skeleton lines={8} />
        </SectionCard>
      ) : (
        <>
          <section className="admin-card-grid">
            <MetricCard
              label="Margem desejada"
              value={`${form.defaultMarginPercent}%`}
              description="Base de precificacao sugerida."
            />
            <MetricCard
              label="Margem minima"
              value={`${form.minimumMarginPercent}%`}
              description="Ponto de alerta para a venda."
            />
            <MetricCard
              label="Alerta de custo"
              value={`${form.costVariationAlertPercent}%`}
              description="Variação minima para revisar preco."
            />
            <MetricCard
              label="Estoque negativo"
              value={form.allowNegativeStock ? "Liberado" : "Bloqueado"}
              description="Controle da operacao sem saldo."
            />
          </section>

          {(metadata.createdAt || metadata.updatedAt) ? (
            <section className="admin-card-grid">
              <MetricCard label="Criado em" value={metadata.createdAt ? formatDate(metadata.createdAt) : "-"} />
              <MetricCard label="Ultima atualizacao" value={metadata.updatedAt ? formatDate(metadata.updatedAt) : "-"} />
            </section>
          ) : null}
        </>
      )}

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel salvar os parametros.">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {!isLoading ? (
        <form onSubmit={handleSubmit} className="admin-page-stack">
          <SectionCard
            title="Margens e alertas"
            description="Ajuste os percentuais que orientam precificacao e revisao comercial."
          >
            <div className="admin-form-grid admin-form-grid--3">
              <Field label="Margem padrao desejada (%)" required>
                <input
                  value={form.defaultMarginPercent}
                  onChange={(event) => updateField("defaultMarginPercent", normalizeDecimalInput(event.target.value))}
                  inputMode="decimal"
                  className="admin-input"
                />
              </Field>

              <Field label="Margem minima (%)" required>
                <input
                  value={form.minimumMarginPercent}
                  onChange={(event) => updateField("minimumMarginPercent", normalizeDecimalInput(event.target.value))}
                  inputMode="decimal"
                  className="admin-input"
                />
              </Field>

              <Field label="Variacao minima de custo para alerta (%)" required>
                <input
                  value={form.costVariationAlertPercent}
                  onChange={(event) =>
                    updateField("costVariationAlertPercent", normalizeDecimalInput(event.target.value))
                  }
                  inputMode="decimal"
                  className="admin-input"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Descontos e estoque"
            description="Defina o quanto cada perfil pode negociar e como o sistema reage a saidas sem saldo."
          >
            <div className="admin-form-grid admin-form-grid--2">
              <Field label="Desconto maximo para usuario comum (%)" required>
                <input
                  value={form.regularDiscountLimitPercent}
                  onChange={(event) =>
                    updateField("regularDiscountLimitPercent", normalizeDecimalInput(event.target.value))
                  }
                  inputMode="decimal"
                  className="admin-input"
                />
              </Field>

              <Field label="Desconto maximo para gerente (%)" required>
                <input
                  value={form.managerDiscountLimitPercent}
                  onChange={(event) =>
                    updateField("managerDiscountLimitPercent", normalizeDecimalInput(event.target.value))
                  }
                  inputMode="decimal"
                  className="admin-input"
                />
              </Field>
            </div>

            <label className="admin-checkbox-row">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(event) => updateField("allowNegativeStock", event.target.checked)}
              />
              <span>
                <strong style={{ display: "block", marginBottom: 4 }}>Permitir estoque negativo</strong>
                Libera a conclusao de saidas mesmo sem saldo disponivel. Use somente quando a operacao precisar dessa flexibilidade.
              </span>
            </label>
          </SectionCard>

          <Alert variant="info" title="Leitura rapida">
            Com os percentuais acima, o sistema sugere preco de venda apos novas entradas, trava descontos excessivos e decide se pode ou nao concluir saidas sem saldo.
          </Alert>

          <StickyActionBar>
            <span className="admin-list-card__hint">
              Revise os percentuais antes de salvar para evitar alertas ou bloqueios inesperados na operacao.
            </span>
            <LoadingButton type="submit" isLoading={isSaving} loadingLabel="Salvando...">
              Salvar parametros
            </LoadingButton>
          </StickyActionBar>
        </form>
      ) : null}
    </main>
  );
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
