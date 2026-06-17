"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  emptyCustomerFormState,
  formatCustomerField,
  type CustomerFormState,
  validateCustomerForm,
} from "@/lib/forms/customer-form";

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField(field: keyof CustomerFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: formatCustomerField(field, value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateCustomerForm(form);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as ApiResult<{ id: string; name: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o cliente.");
        return;
      }

      setSuccessMessage("Cliente salvo com sucesso.");
      setForm(emptyCustomerFormState);

      window.setTimeout(() => {
        router.push("/admin/clientes");
        router.refresh();
      }, 900);
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 960, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Novo cliente</h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 0 }}>
            Cadastro base para pessoas e empresas atendidas pela grafica.
          </p>
        </div>
        <Link href="/admin/clientes" style={secondaryButtonStyle}>
          Voltar para clientes
        </Link>
      </div>

      <section
        style={{
          padding: 20,
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "rgba(255, 250, 244, 0.82)",
          color: "var(--muted)",
          lineHeight: 1.6,
        }}
      >
        Os campos com <strong style={{ color: "var(--primary)" }}>*</strong> sao obrigatorios.
      </section>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <Field label="Nome ou razao social" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Ex.: Cliente Teste"
            style={inputStyle}
          />
        </Field>

        <Field label="CPF ou CNPJ">
          <input
            value={form.document}
            onChange={(event) => updateField("document", event.target.value)}
            inputMode="numeric"
            maxLength={18}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            style={inputStyle}
          />
        </Field>

        <Field label="E-mail">
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="cliente@empresa.com"
            autoComplete="email"
            style={inputStyle}
          />
        </Field>

        <Field label="Telefone">
          <input
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            inputMode="tel"
            maxLength={15}
            placeholder="(11) 3333-4444"
            style={inputStyle}
          />
        </Field>

        <Field label="WhatsApp">
          <input
            value={form.whatsapp}
            onChange={(event) => updateField("whatsapp", event.target.value)}
            inputMode="tel"
            maxLength={15}
            placeholder="(11) 99999-0000"
            style={inputStyle}
          />
        </Field>

        <Field label="CEP">
          <input
            value={form.addressZipCode}
            onChange={(event) => updateField("addressZipCode", event.target.value)}
            inputMode="numeric"
            maxLength={9}
            placeholder="00000-000"
            style={inputStyle}
          />
        </Field>

        <Field label="Rua">
          <input
            value={form.addressStreet}
            onChange={(event) => updateField("addressStreet", event.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
        </Field>

        <Field label="Numero">
          <input
            value={form.addressNumber}
            onChange={(event) => updateField("addressNumber", event.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
        </Field>

        <Field label="Bairro">
          <input
            value={form.addressDistrict}
            onChange={(event) => updateField("addressDistrict", event.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
        </Field>

        <Field label="Cidade">
          <input
            value={form.addressCity}
            onChange={(event) => updateField("addressCity", event.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
        </Field>

        <Field label="Estado">
          <input
            value={form.addressState}
            onChange={(event) => updateField("addressState", event.target.value)}
            maxLength={2}
            placeholder="UF"
            style={inputStyle}
          />
        </Field>

        <div />

        <Field label="Observacoes" fullWidth>
          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Informacoes complementares sobre o cliente"
            rows={5}
            style={{ ...inputStyle, padding: 14, height: "auto" }}
          />
        </Field>

        {errorMessage ? (
          <p style={{ ...feedbackStyle, ...errorStyle, gridColumn: "1 / -1" }}>{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p style={{ ...feedbackStyle, ...successStyle, gridColumn: "1 / -1" }}>
            {successMessage} Redirecionando para a listagem...
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", gridColumn: "1 / -1" }}>
          <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
            {isSubmitting ? "Salvando..." : "Salvar cliente"}
          </button>
          <Link href="/admin/clientes" style={secondaryButtonStyle}>
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  required,
  fullWidth,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <label
      style={{
        display: "grid",
        gap: 8,
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
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
  height: 50,
  padding: "0 20px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const secondaryButtonStyle = {
  height: 50,
  padding: "0 20px",
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
