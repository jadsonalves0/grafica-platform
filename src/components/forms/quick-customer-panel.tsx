"use client";

import { useState } from "react";
import {
  formatPhone,
  normalizeEmailInput,
} from "@/lib/forms/br-utils";

type CustomerCreated = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
};

type QuickCustomerPanelProps = {
  onCreated: (customer: CustomerCreated) => void;
  onCancel?: () => void;
};

type ApiResult = {
  success: boolean;
  message?: string;
  data?: CustomerCreated;
};

export function QuickCustomerPanel({
  onCreated,
  onCancel,
}: Readonly<QuickCustomerPanelProps>) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length < 2) {
      setErrorMessage("Informe pelo menos o nome do cliente.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email ? normalizeEmailInput(email) : undefined,
          phone: phone || undefined,
          whatsapp: whatsapp || undefined,
        }),
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel cadastrar o cliente.");
        return;
      }

      onCreated(result.data);
    } catch {
      setErrorMessage("Falha ao cadastrar o cliente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 14,
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(181, 66, 31, 0.14)",
        background: "rgba(255,255,255,0.72)",
      }}
    >
      <div>
        <strong style={{ display: "block", marginBottom: 6 }}>Cadastro rapido de cliente</strong>
        <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Use este atalho quando o cliente ainda nao estiver na base.
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome ou razao social"
          style={inputStyle}
        />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            type="email"
            style={inputStyle}
          />
          <input
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            placeholder="Telefone"
            inputMode="tel"
            maxLength={15}
            style={inputStyle}
          />
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(formatPhone(event.target.value))}
            placeholder="WhatsApp"
            inputMode="tel"
            maxLength={15}
            style={inputStyle}
          />
        </div>

        {errorMessage ? <p style={errorStyle}>{errorMessage}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          {onCancel ? (
            <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
              Cancelar
            </button>
          ) : null}
          <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
            {isSubmitting ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>
      </form>
    </section>
  );
}

const inputStyle = {
  height: 46,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const primaryButtonStyle = {
  height: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  height: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const errorStyle = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(181, 66, 31, 0.12)",
  color: "var(--primary)",
  lineHeight: 1.6,
} as const;
