"use client";

import Link from "next/link";
import { useState } from "react";
import { MoneyInput } from "@/components/forms/number-inputs";
import { parseCurrencyInput } from "@/lib/forms/br-utils";

type AccountFormState = {
  name: string;
  type: "CASH" | "BANK" | "DIGITAL_WALLET";
  initialBalance: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type AccountFormProps = {
  mode: "create" | "edit";
  accountId?: string;
  initialState?: AccountFormState;
  metadata?: {
    createdAt?: string;
  };
};

const defaultState: AccountFormState = {
  name: "",
  type: "BANK",
  initialBalance: "0,00",
};

export function AccountForm({ mode, accountId, initialState, metadata }: Readonly<AccountFormProps>) {
  const [form, setForm] = useState<AccountFormState>(initialState ?? defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof AccountFormState>(field: K, value: AccountFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (form.name.trim().length < 2) {
      return "Informe o nome da conta.";
    }

    if (parseCurrencyInput(form.initialBalance) < 0) {
      return "O saldo inicial nao pode ser negativo.";
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
      const endpoint =
        mode === "create" ? "/api/financial/accounts" : `/api/financial/accounts/${accountId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          initialBalance: parseCurrencyInput(form.initialBalance),
        }),
      });

      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar a conta.");
        return;
      }

      setSuccessMessage(
        mode === "create" ? "Conta cadastrada com sucesso." : "Conta atualizada com sucesso.",
      );

      if (mode === "create") {
        setForm(defaultState);
      }
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {metadata?.createdAt ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <InfoCard label="Criada em" value={formatDate(metadata.createdAt)} />
          <InfoCard label="Tipo" value={formatAccountType(form.type)} accent />
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
        <Field label="Nome da conta" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={120}
            style={inputStyle}
          />
        </Field>

        <Field label="Tipo" required>
          <select
            value={form.type}
            onChange={(event) => updateField("type", event.target.value as AccountFormState["type"])}
            style={inputStyle}
          >
            <option value="BANK">Banco</option>
            <option value="CASH">Caixa</option>
            <option value="DIGITAL_WALLET">Carteira digital</option>
          </select>
        </Field>

        <Field label="Saldo inicial">
          <MoneyInput
            value={form.initialBalance}
            onChange={(value) => updateField("initialBalance", value)}
            style={inputStyle}
          />
        </Field>

        <div />

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 10,
            borderTop: "1px solid rgba(232, 217, 202, 0.85)",
          }}
        >
          <Link href="/admin/financeiro" style={secondaryButtonStyle}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar conta"
                : "Salvar alteracoes"}
          </button>
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

function formatAccountType(type: string) {
  const labels: Record<string, string> = {
    CASH: "Caixa",
    BANK: "Banco",
    DIGITAL_WALLET: "Carteira digital",
  };
  return labels[type] ?? type;
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
