"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FinancialCategoryFormState = {
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
};

type FinancialCategoryResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    isActive: boolean;
  };
};

type FinancialCategoryFormProps = {
  mode: "create" | "edit";
  categoryId?: string;
  initialState?: FinancialCategoryFormState;
};

const defaultState: FinancialCategoryFormState = {
  name: "",
  type: "EXPENSE",
  isActive: true,
};

export function FinancialCategoryForm({
  mode,
  categoryId,
  initialState,
}: Readonly<FinancialCategoryFormProps>) {
  const router = useRouter();
  const [form, setForm] = useState<FinancialCategoryFormState>(initialState ?? defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof FinancialCategoryFormState>(
    field: K,
    value: FinancialCategoryFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setErrorMessage("Informe o nome da categoria.");
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        mode === "create" ? "/api/financial/categories" : `/api/financial/categories/${categoryId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            type: form.type,
            isActive: form.isActive,
          }),
        },
      );

      const result = (await response.json()) as FinancialCategoryResponse;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar a categoria.");
        return;
      }

      setSuccessMessage(
        mode === "create" ? "Categoria criada com sucesso." : "Categoria atualizada com sucesso.",
      );

      window.setTimeout(() => {
        router.push("/admin/financeiro/categorias");
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 18,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <Field label="Nome da categoria" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={120}
            style={inputStyle}
            placeholder="Ex.: Papelaria, Frete, Venda balcão"
          />
        </Field>

        <Field label="Natureza" required>
          <select
            value={form.type}
            onChange={(event) => updateField("type", event.target.value as FinancialCategoryFormState["type"])}
            style={inputStyle}
          >
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
        </Field>
      </div>

      {mode === "edit" ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 14,
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.78)",
          }}
        >
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField("isActive", event.target.checked)}
          />
          <span>Categoria ativa para novos lancamentos</span>
        </label>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(232, 217, 202, 0.85)",
        }}
      >
        <Link href="/admin/financeiro/categorias" style={secondaryButtonStyle}>
          Cancelar
        </Link>
        <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
          {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar categoria" : "Salvar alteracoes"}
        </button>
      </div>
    </form>
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
