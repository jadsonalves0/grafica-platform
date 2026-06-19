"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeDecimalInput, parseDecimalInput } from "@/lib/forms/br-utils";

type ItemGroupFormState = {
  name: string;
  description: string;
  defaultMargin: string;
  showOnWebsite: boolean;
  isActive: boolean;
};

type ItemGroupResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
  };
};

type ItemGroupFormProps = {
  mode: "create" | "edit";
  groupId?: string;
  initialState?: ItemGroupFormState;
};

const defaultState: ItemGroupFormState = {
  name: "",
  description: "",
  defaultMargin: "",
  showOnWebsite: false,
  isActive: true,
};

export function ItemGroupForm({
  mode,
  groupId,
  initialState,
}: Readonly<ItemGroupFormProps>) {
  const router = useRouter();
  const [form, setForm] = useState<ItemGroupFormState>(initialState ?? defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof ItemGroupFormState>(field: K, value: ItemGroupFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setErrorMessage("Informe o nome do grupo.");
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        mode === "create" ? "/api/inventory/groups" : `/api/inventory/groups/${groupId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            defaultMargin: form.defaultMargin ? parseDecimalInput(form.defaultMargin) : undefined,
            showOnWebsite: form.showOnWebsite,
            isActive: form.isActive,
          }),
        },
      );

      const result = (await response.json()) as ItemGroupResponse;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o grupo.");
        return;
      }

      setSuccessMessage(
        mode === "create" ? "Grupo criado com sucesso." : "Grupo atualizado com sucesso.",
      );

      window.setTimeout(() => {
        router.push("/admin/estoque/grupos");
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
        <Field label="Nome do grupo" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={120}
            style={inputStyle}
            placeholder="Ex.: Papelaria, Adesivos, Acabamentos"
          />
        </Field>

        <Field label="Margem padrao (%)">
          <input
            value={form.defaultMargin}
            onChange={(event) => updateField("defaultMargin", normalizeDecimalInput(event.target.value))}
            inputMode="decimal"
            style={inputStyle}
            placeholder="Ex.: 35"
          />
        </Field>
      </div>

      <Field label="Descricao">
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          maxLength={500}
          rows={5}
          style={textareaStyle}
          placeholder="Explique rapidamente para que esse grupo sera usado."
        />
      </Field>

      <div style={{ display: "grid", gap: 12 }}>
        <ToggleRow
          checked={form.showOnWebsite}
          label="Mostrar grupo no site"
          onChange={(checked) => updateField("showOnWebsite", checked)}
        />
        {mode === "edit" ? (
          <ToggleRow
            checked={form.isActive}
            label="Grupo ativo para novos cadastros"
            onChange={(checked) => updateField("isActive", checked)}
          />
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(232, 217, 202, 0.85)",
        }}
      >
        <Link href="/admin/estoque/grupos" style={secondaryButtonStyle}>
          Cancelar
        </Link>
        <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
          {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar grupo" : "Salvar alteracoes"}
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

function ToggleRow({
  checked,
  label,
  onChange,
}: Readonly<{ checked: boolean; label: string; onChange: (checked: boolean) => void }>) {
  return (
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
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
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

const textareaStyle = {
  minHeight: 120,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
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
