"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Field,
  FormSection,
  LoadingButton,
  MetricCard,
  SectionCard,
  StickyActionBar,
  StatusBadge,
} from "@/components/admin/ui";
import {
  formatCurrencyInput,
  isValidGtin,
  normalizeDecimalInput,
  normalizeGtinInput,
  normalizeSkuInput,
  normalizeUnitInput,
  parseCurrencyInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";

type ProductFormState = {
  categoryId: string;
  name: string;
  sku: string;
  barcode: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  unit: string;
  controlsStock: boolean;
  showOnWebsite: boolean;
  desiredMargin: string;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
};

type ProductResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
  };
};

type GroupOption = {
  id: string;
  name: string;
  defaultMargin?: number | null;
  showOnWebsite: boolean;
  isActive: boolean;
};

type ProductPriceHistory = {
  id: string;
  changeType: "COST" | "PRICE";
  previousValue: number;
  newValue: number;
  origin: string;
  relatedDocument?: string | null;
  justification?: string | null;
  changedByUserName?: string | null;
  createdAt: string;
};

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialState?: ProductFormState;
  onSuccessRedirect?: string;
  onDelete?: () => Promise<void>;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
  };
  history?: ProductPriceHistory[];
};

const defaultState: ProductFormState = {
  categoryId: "",
  name: "",
  sku: "",
  barcode: "",
  type: "FINISHED_PRODUCT",
  unit: "un",
  controlsStock: true,
  showOnWebsite: false,
  desiredMargin: "",
  costPrice: "0,00",
  salePrice: "0,00",
  minimumStock: "0",
};

export function ProductForm({
  mode,
  productId,
  initialState,
  onSuccessRedirect = "/admin/estoque",
  onDelete,
  metadata,
  history = [],
}: Readonly<ProductFormProps>) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormState>(initialState ?? defaultState);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroups() {
      setIsLoadingGroups(true);

      try {
        const response = await fetch("/api/inventory/groups", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as { success: boolean; data?: GroupOption[]; message?: string };

        if (!response.ok || !result.success || !result.data) {
          return;
        }

        setGroups(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      } finally {
        setIsLoadingGroups(false);
      }
    }

    loadGroups();

    return () => controller.abort();
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === form.categoryId) ?? null,
    [groups, form.categoryId],
  );

  function updateField<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "type") {
        if (value === "SERVICE") {
          next.controlsStock = false;
        } else if (current.type === "SERVICE") {
          next.controlsStock = true;
        }
      }

      if (field === "categoryId") {
        const group = groups.find((item) => item.id === value);
        if (group?.defaultMargin !== null && group?.defaultMargin !== undefined && !current.desiredMargin) {
          next.desiredMargin = normalizeDecimalInput(String(group.defaultMargin));
        }
        if (group?.showOnWebsite && !current.showOnWebsite) {
          next.showOnWebsite = true;
        }
      }

      return next;
    });
  }

  function validateForm() {
    if (form.name.trim().length < 2) {
      return "Informe o nome do item.";
    }

    if (form.unit.trim().length < 1) {
      return "Informe a unidade do item.";
    }

    if (form.barcode && !isValidGtin(form.barcode)) {
      return "Informe um EAN/GTIN valido.";
    }

    if (parseCurrencyInput(form.costPrice) < 0 || parseCurrencyInput(form.salePrice) < 0) {
      return "Valores financeiros nao podem ser negativos.";
    }

    const desiredMargin = form.desiredMargin ? parseDecimalInput(form.desiredMargin) : 0;
    if (desiredMargin < 0 || desiredMargin >= 100) {
      return "A margem desejada deve estar entre 0 e 99,99%.";
    }

    if (parseDecimalInput(form.minimumStock) < 0) {
      return "O estoque minimo nao pode ser negativo.";
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

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const endpoint = mode === "create" ? "/api/inventory/products" : `/api/inventory/products/${productId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: form.categoryId || undefined,
          name: form.name.trim(),
          sku: form.sku,
          barcode: form.barcode,
          type: form.type,
          unit: form.unit,
          controlsStock: form.type === "SERVICE" ? false : form.controlsStock,
          showOnWebsite: form.showOnWebsite,
          desiredMargin: form.desiredMargin ? parseDecimalInput(form.desiredMargin) : undefined,
          costPrice: parseCurrencyInput(form.costPrice),
          salePrice: parseCurrencyInput(form.salePrice),
          minimumStock: parseDecimalInput(form.minimumStock),
        }),
      });

      const result = (await response.json()) as ProductResponse;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o item.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? `Item ${result.data.name} cadastrado com sucesso.`
          : "Item atualizado com sucesso.",
      );

      if (mode === "create") {
        setForm(defaultState);
      }

      window.setTimeout(() => {
        router.push(onSuccessRedirect);
        router.refresh();
      }, 800);
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    const confirmed = window.confirm(
      "Deseja realmente excluir este item? Essa acao nao pode ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onDelete();
    } catch {
      setErrorMessage("Nao foi possivel excluir o item.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {metadata?.createdAt || metadata?.updatedAt ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <MetricCard label="Criado em" value={metadata.createdAt ? formatDate(metadata.createdAt) : "-"} />
          <MetricCard label="Ultima atualizacao" value={metadata.updatedAt ? formatDate(metadata.updatedAt) : "-"} />
          <MetricCard label="Cadastro" value={metadata.isActive === false ? "Inativo" : "Ativo"} />
        </section>
      ) : null}

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel salvar o item.">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <FormSection
          title="Informacoes principais"
          description="Preencha primeiro os dados que identificam e comercializam o item."
        >
          <div style={twoColumnGridStyle}>
            <Field label="Nome do item" required>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={200}
                className="admin-input"
              />
            </Field>

            <Field label="Tipo" required>
              <select
                value={form.type}
                onChange={(event) =>
                  updateField(
                    "type",
                    event.target.value as "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE",
                  )
                }
                className="admin-select"
              >
                <option value="RAW_MATERIAL">Materia-prima</option>
                <option value="SERVICE">Servico</option>
                <option value="FINISHED_PRODUCT">Produto final</option>
                <option value="RESALE">Revenda</option>
              </select>
            </Field>

            <Field label="Grupo do item" optional>
              <select
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
                className="admin-select"
                disabled={isLoadingGroups}
              >
                <option value="">Sem grupo definido</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id} disabled={!group.isActive}>
                    {group.name}
                    {!group.isActive ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unidade" required>
              <input
                value={form.unit}
                onChange={(event) => updateField("unit", normalizeUnitInput(event.target.value))}
                placeholder="un, pct, m2, hr..."
                maxLength={12}
                className="admin-input"
              />
            </Field>

            <Field label="Preco de venda atual (R$)">
              <input
                value={form.salePrice}
                onChange={(event) => updateField("salePrice", formatCurrencyInput(event.target.value))}
                inputMode="numeric"
                className="admin-input"
              />
            </Field>

            <Field label="Controla estoque">
              <ToggleRow
                checked={form.type === "SERVICE" ? false : form.controlsStock}
                disabled={form.type === "SERVICE"}
                label={
                  form.type === "SERVICE"
                    ? "Servico nao controla estoque nesta fase"
                    : "Controlar estoque para este item"
                }
                onChange={(checked) => updateField("controlsStock", checked)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Estoque e custo"
          description="Use estes dados para reposicao, leitura de margem e acompanhamento."
        >
          <div style={twoColumnGridStyle}>
            <Field label="Custo de referencia (R$)">
              <input
                value={form.costPrice}
                onChange={(event) => updateField("costPrice", formatCurrencyInput(event.target.value))}
                inputMode="numeric"
                className="admin-input"
              />
            </Field>

            <Field label="Estoque minimo">
              <input
                value={form.minimumStock}
                onChange={(event) =>
                  updateField("minimumStock", normalizeDecimalInput(event.target.value))
                }
                inputMode="decimal"
                className="admin-input"
              />
            </Field>

            <Field
              label="Margem desejada (%)"
              helpText={
                selectedGroup?.defaultMargin !== null && selectedGroup?.defaultMargin !== undefined
                  ? `O grupo sugere ${selectedGroup.defaultMargin.toFixed(2).replace(".", ",")}% como margem padrao.`
                  : "Opcional. Pode ser usada para orientar revisao de preco."
              }
            >
              <input
                value={form.desiredMargin}
                onChange={(event) => updateField("desiredMargin", normalizeDecimalInput(event.target.value))}
                inputMode="decimal"
                className="admin-input"
                placeholder={selectedGroup?.defaultMargin ? `${selectedGroup.defaultMargin.toFixed(2).replace(".", ",")}` : "Ex.: 35"}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Identificacao adicional"
          description="Abra esta parte quando precisar refinar a rastreabilidade comercial."
          defaultOpen={false}
        >
          <div style={twoColumnGridStyle}>
            <Field label="SKU" optional>
              <input
                value={form.sku}
                onChange={(event) => updateField("sku", normalizeSkuInput(event.target.value))}
                placeholder="Ex.: PAPEL-A4-180G"
                maxLength={40}
                className="admin-input"
              />
            </Field>

            <Field
              label="EAN / GTIN"
              optional
              helpText="Opcional no piloto, mas recomendado para itens comercializados com codigo de barras."
            >
              <input
                value={form.barcode}
                onChange={(event) => updateField("barcode", normalizeGtinInput(event.target.value))}
                placeholder="8, 12, 13 ou 14 digitos"
                inputMode="numeric"
                maxLength={14}
                className="admin-input"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Website"
          description="Controle a exibicao do item no site publico quando fizer sentido comercialmente."
          defaultOpen={false}
        >
          <ToggleRow
            checked={form.showOnWebsite}
            label="Permitir exibicao do item no website"
            onChange={(checked) => updateField("showOnWebsite", checked)}
          />
        </FormSection>

        <StickyActionBar>
          {mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="admin-button admin-button--danger"
            >
              {isDeleting ? "Excluindo..." : "Excluir item"}
            </button>
          ) : (
            <span />
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/estoque" className="admin-button admin-button--secondary">
              Cancelar
            </Link>
            <LoadingButton isLoading={isSubmitting} loadingLabel="Salvando..." type="submit">
              {mode === "create" ? "Salvar item" : "Salvar alteracoes"}
            </LoadingButton>
          </div>
        </StickyActionBar>
      </form>

      {mode === "edit" ? (
        <SectionCard
          title="Historico de custo e preco"
          description="Consulta somente leitura das alteracoes de custo e preco sem afetar documentos historicos."
        >
          {history.length === 0 ? (
            <div style={emptyHistoryStyle}>Nenhuma alteracao registrada ate o momento.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {history.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 0.7fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.1fr)",
                    gap: 16,
                    alignItems: "center",
                    padding: 18,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "#fff",
                  }}
                >
                  <StatusBadge
                    status={entry.changeType === "COST" ? "Custo" : "Preco"}
                    tone={entry.changeType === "COST" ? "warning" : "success"}
                  />
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      {formatCurrency(entry.previousValue)} → {formatCurrency(entry.newValue)}
                    </strong>
                    <span style={{ color: "var(--muted)" }}>{formatOrigin(entry.origin)}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      {entry.changedByUserName || "Usuario nao identificado"}
                    </strong>
                    <span style={{ color: "var(--muted)" }}>
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                    {entry.justification || entry.relatedDocument || "Sem observacoes adicionais."}
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}
    </>
  );
}

function ToggleRow({
  checked,
  disabled,
  label,
  onChange,
}: Readonly<{ checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }>) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "#fff",
        opacity: disabled ? 0.75 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatOrigin(origin: string) {
  const labels: Record<string, string> = {
    ITEM_CREATE: "Cadastro inicial",
    MANUAL_UPDATE: "Atualizacao manual",
  };

  return labels[origin] ?? origin;
}

const emptyHistoryStyle = {
  padding: 24,
  borderRadius: 14,
  border: "1px dashed var(--border)",
  background: "#fcfcfd",
  color: "var(--muted)",
  textAlign: "center" as const,
} as const;

const twoColumnGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
} as const;
