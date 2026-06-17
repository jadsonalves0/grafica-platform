"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  formatCurrencyInput,
  normalizeGtinInput,
  normalizeDecimalInput,
  normalizeSkuInput,
  normalizeUnitInput,
  isValidGtin,
  parseCurrencyInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";

type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
  unit: string;
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

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialState?: ProductFormState;
  onSuccessRedirect?: string;
  onDelete?: () => Promise<void>;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
  };
};

const defaultState: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  type: "FINISHED_PRODUCT",
  unit: "un",
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
}: Readonly<ProductFormProps>) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormState>(initialState ?? defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField(field: keyof ProductFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
          name: form.name.trim(),
          sku: form.sku,
          barcode: form.barcode,
          type: form.type,
          unit: form.unit,
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
          <InfoCard label="Criado em" value={metadata.createdAt ? formatDate(metadata.createdAt) : "-"} />
          <InfoCard
            label="Ultima atualizacao"
            value={metadata.updatedAt ? formatDate(metadata.updatedAt) : "-"}
          />
          <InfoCard label="Status" value="Ativo" accent />
        </section>
      ) : null}

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <Field label="Nome do item" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={200}
            style={inputStyle}
          />
        </Field>

        <Field label="SKU">
          <input
            value={form.sku}
            onChange={(event) => updateField("sku", normalizeSkuInput(event.target.value))}
            placeholder="Ex.: PAPEL-A4-180G"
            maxLength={40}
            style={inputStyle}
          />
        </Field>

        <Field label="EAN / GTIN">
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={form.barcode}
              onChange={(event) => updateField("barcode", normalizeGtinInput(event.target.value))}
              placeholder="8, 12, 13 ou 14 digitos"
              inputMode="numeric"
              maxLength={14}
              style={inputStyle}
            />
            <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
              Opcional no piloto, mas recomendado para itens comercializados com codigo de barras.
            </span>
          </div>
        </Field>

        <Field label="Tipo" required>
          <select
            value={form.type}
            onChange={(event) =>
              updateField(
                "type",
                event.target.value as "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT",
              )
            }
            style={inputStyle}
          >
            <option value="RAW_MATERIAL">Materia-prima</option>
            <option value="SERVICE">Servico</option>
            <option value="FINISHED_PRODUCT">Produto final</option>
          </select>
        </Field>

        <Field label="Unidade" required>
          <input
            value={form.unit}
            onChange={(event) => updateField("unit", normalizeUnitInput(event.target.value))}
            placeholder="un, pct, m2, hr..."
            maxLength={12}
            style={inputStyle}
          />
        </Field>

        <Field label="Custo (R$)">
          <input
            value={form.costPrice}
            onChange={(event) => updateField("costPrice", formatCurrencyInput(event.target.value))}
            inputMode="numeric"
            style={inputStyle}
          />
        </Field>

        <Field label="Preco de venda (R$)">
          <input
            value={form.salePrice}
            onChange={(event) => updateField("salePrice", formatCurrencyInput(event.target.value))}
            inputMode="numeric"
            style={inputStyle}
          />
        </Field>

        <Field label="Estoque minimo">
          <input
            value={form.minimumStock}
            onChange={(event) =>
              updateField("minimumStock", normalizeDecimalInput(event.target.value))
            }
            inputMode="decimal"
            style={inputStyle}
          />
        </Field>

        <div />

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            paddingTop: 10,
            borderTop: "1px solid rgba(232, 217, 202, 0.85)",
          }}
        >
          {mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              style={dangerButtonStyle}
            >
              {isDeleting ? "Excluindo..." : "Excluir item"}
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/estoque" style={secondaryButtonStyle}>
              Cancelar
            </Link>
            <button type="submit" disabled={isSubmitting || isDeleting} style={primaryButtonStyle}>
              {isSubmitting
                ? "Salvando..."
                : mode === "create"
                  ? "Salvar item"
                  : "Salvar alteracoes"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>
        {label}
        {required ? <strong style={{ color: "var(--primary)" }}> *</strong> : null}
      </span>
      {children}
    </label>
  );
}

function InfoCard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: accent ? "rgba(43, 110, 82, 0.12)" : "rgba(255,255,255,0.75)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: accent ? "#245844" : "var(--primary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: 28 }}>{value}</h2>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const inputStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const primaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const dangerButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "#a72d2d",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const feedbackStyle = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 14,
  lineHeight: 1.6,
} as const;

const errorStyle = {
  background: "rgba(181, 66, 31, 0.12)",
  color: "var(--primary)",
} as const;

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
} as const;
