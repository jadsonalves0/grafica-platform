"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  emptyCustomerFormState,
  formatCustomerField,
  maskCustomerFormState,
  type CustomerFormState,
  validateCustomerForm,
} from "@/lib/forms/customer-form";

type CustomerDetail = CustomerFormState & {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarClientePage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params.customerId;

  const [form, setForm] = useState<CustomerFormState>(emptyCustomerFormState);
  const [meta, setMeta] = useState<{ createdAt?: string; updatedAt?: string; isActive?: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomer() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/customers/${customerId}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<CustomerDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o cliente.");
          return;
        }

        setForm(maskCustomerFormState({
          name: result.data.name ?? "",
          document: result.data.document ?? "",
          email: result.data.email ?? "",
          phone: result.data.phone ?? "",
          whatsapp: result.data.whatsapp ?? "",
          addressZipCode: result.data.addressZipCode ?? "",
          addressStreet: result.data.addressStreet ?? "",
          addressNumber: result.data.addressNumber ?? "",
          addressDistrict: result.data.addressDistrict ?? "",
          addressCity: result.data.addressCity ?? "",
          addressState: result.data.addressState ?? "",
          notes: result.data.notes ?? "",
        }));
        setMeta({
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          isActive: result.data.isActive,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o cliente.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomer();

    return () => controller.abort();
  }, [customerId]);

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
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as ApiResult<CustomerDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o cliente.");
        return;
      }

      router.push("/admin/clientes?feedback=updated");
      router.refresh();
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(nextStatus: boolean) {
    const actionLabel = nextStatus ? "reativar" : "inativar";
    const confirmed = window.confirm(
      `Deseja realmente ${actionLabel} este cliente?`,
    );

    if (!confirmed) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      const result = (await response.json()) as ApiResult<CustomerDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o status do cliente.");
        return;
      }

      const feedback = nextStatus ? "activated" : "deactivated";
      router.push(`/admin/clientes?feedback=${feedback}`);
      router.refresh();
    } catch {
      setErrorMessage("Falha ao atualizar o status do cliente.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Deseja realmente excluir este cliente? Essa acao nao pode ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as ApiResult<{ deleted: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel excluir o cliente.");
        return;
      }

      router.push("/admin/clientes?feedback=deleted");
      router.refresh();
    } catch {
      setErrorMessage("Falha ao excluir o cliente.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando cadastro...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos trazendo os dados do cliente.</span>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p
            style={{
              margin: 0,
              color: "var(--primary)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Cadastro de clientes
          </p>
          <h1 style={{ margin: "10px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar cliente
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            Atualize os dados de contato e mantenha a base comercial limpa para
            orcamentos, pedidos e financeiro.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/clientes" style={secondaryButtonStyle}>
            Voltar para clientes
          </Link>
          <Link href="/admin/orcamentos/novo" style={ghostButtonStyle}>
            Criar orcamento
          </Link>
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <InfoCard label="Criado em" value={meta.createdAt ? formatDate(meta.createdAt) : "-"} />
        <InfoCard
          label="Ultima atualizacao"
          value={meta.updatedAt ? formatDate(meta.updatedAt) : "-"}
        />
        <InfoCard
          label="Cadastro"
          value={meta.isActive ? "Ativo" : "Inativo"}
          accent={meta.isActive}
        />
      </section>

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
        <Field label="Nome ou razao social" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
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
            style={inputStyle}
          />
        </Field>

        <Field label="Numero">
          <input
            value={form.addressNumber}
            onChange={(event) => updateField("addressNumber", event.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Bairro">
          <input
            value={form.addressDistrict}
            onChange={(event) => updateField("addressDistrict", event.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Cidade">
          <input
            value={form.addressCity}
            onChange={(event) => updateField("addressCity", event.target.value)}
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
            rows={5}
            style={{ ...inputStyle, height: "auto", padding: 14 }}
          />
        </Field>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gap: 14,
            paddingTop: 10,
            borderTop: "1px solid rgba(232, 217, 202, 0.85)",
          }}
        >
          {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle, marginBottom: 0 }}>{errorMessage}</p> : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleStatusChange(!meta.isActive)}
                disabled={isDeleting || isSubmitting || isUpdatingStatus}
                style={meta.isActive ? warningButtonStyle : successButtonStyle}
              >
                {isUpdatingStatus
                  ? meta.isActive
                    ? "Inativando..."
                    : "Reativando..."
                  : meta.isActive
                    ? "Inativar cadastro"
                    : "Reativar cadastro"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting || isUpdatingStatus}
                style={dangerButtonStyle}
              >
                {isDeleting ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/admin/clientes" style={secondaryButtonStyle}>
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || isUpdatingStatus}
                style={primaryButtonStyle}
              >
                {isSubmitting ? "Salvando..." : "Salvar e voltar para clientes"}
              </button>
            </div>
          </div>
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
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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

const ghostButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
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

const warningButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "#9a5b11",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const successButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "#2b6e52",
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

const loadingPanelStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  padding: 42,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
} as const;
