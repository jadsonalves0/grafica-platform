"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPhone,
  isValidEmail,
  isValidPhone,
  normalizeEmailInput,
} from "@/lib/forms/br-utils";

type RoleOption = {
  id: string;
  name: string;
  code: string;
};

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: "ACTIVE" | "INVITED" | "BLOCKED";
  roleIds: string[];
  isPlatformAdmin: boolean;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type UserFormProps = {
  mode: "create" | "edit";
  userId?: string;
  initialState?: UserFormState;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
  };
};

const defaultState: UserFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "ACTIVE",
  roleIds: [],
  isPlatformAdmin: false,
};

export function UserForm({ mode, userId, initialState, metadata }: Readonly<UserFormProps>) {
  const [form, setForm] = useState<UserFormState>(initialState ?? defaultState);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoles() {
      setIsLoadingRoles(true);

      try {
        const response = await fetch("/api/admin/roles", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<RoleOption[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os perfis.");
          setRoles([]);
          return;
        }

        setRoles(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar os perfis de acesso.");
      } finally {
        setIsLoadingRoles(false);
      }
    }

    loadRoles();

    return () => controller.abort();
  }, []);

  function updateField<K extends keyof UserFormState>(field: K, value: UserFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (form.name.trim().length < 3) {
      return "Informe o nome completo do usuario.";
    }

    if (!isValidEmail(form.email)) {
      return "Informe um e-mail valido.";
    }

    if (form.phone && !isValidPhone(form.phone)) {
      return "Informe um telefone valido com DDD.";
    }

    if (mode === "create" && form.password.trim().length < 8) {
      return "A senha inicial deve ter pelo menos 8 caracteres.";
    }

    if (form.roleIds.length === 0) {
      return "Selecione pelo menos um perfil de acesso.";
    }

    return null;
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((item) => item !== roleId)
        : [...current.roleIds, roleId],
    }));
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
      const endpoint = mode === "create" ? "/api/admin/users" : `/api/admin/users/${userId}`;
      const payload =
        mode === "create"
          ? {
              companyId: undefined,
              name: form.name.trim(),
              email: normalizeEmailInput(form.email),
              phone: form.phone,
              password: form.password,
              roleIds: form.roleIds,
              isPlatformAdmin: form.isPlatformAdmin,
            }
          : {
              name: form.name.trim(),
              phone: form.phone,
              status: form.status,
              roleIds: form.roleIds,
              isPlatformAdmin: form.isPlatformAdmin,
            };

      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResult<{ name: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o usuario.");
        return;
      }

      setSuccessMessage(
        mode === "create" ? "Usuario cadastrado com sucesso." : "Usuario atualizado com sucesso.",
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
          <InfoCard label="Acesso" value={formatStatus(form.status)} accent />
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
        <Field label="Nome completo" required>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={200}
            style={inputStyle}
          />
        </Field>

        <Field label="E-mail" required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", normalizeEmailInput(event.target.value))}
            disabled={mode === "edit"}
            autoComplete="email"
            style={{ ...inputStyle, opacity: mode === "edit" ? 0.72 : 1 }}
          />
        </Field>

        <Field label="Telefone">
          <input
            value={form.phone}
            onChange={(event) => updateField("phone", formatPhone(event.target.value))}
            inputMode="tel"
            maxLength={15}
            placeholder="(11) 99999-0000"
            style={inputStyle}
          />
        </Field>

        {mode === "create" ? (
          <Field label="Senha inicial" required>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              style={inputStyle}
            />
          </Field>
        ) : (
          <Field label="Status de acesso" required>
            <select
              value={form.status}
              onChange={(event) =>
                updateField("status", event.target.value as UserFormState["status"])
              }
              style={inputStyle}
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INVITED">Convidado</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </Field>
        )}

        <label
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.7)",
          }}
        >
          <input
            type="checkbox"
            checked={form.isPlatformAdmin}
            onChange={(event) => updateField("isPlatformAdmin", event.target.checked)}
          />
          <span>Administrador da plataforma</span>
        </label>

        <section
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gap: 12,
            padding: 18,
            borderRadius: 20,
            border: "1px solid rgba(232, 217, 202, 0.9)",
            background: "rgba(255,255,255,0.75)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Perfis de acesso</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Selecione pelo menos um perfil para liberar os modulos corretos.
            </p>
          </div>

          {isLoadingRoles ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>Carregando perfis...</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {roles.map((role) => (
                <label
                  key={role.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: form.roleIds.includes(role.id)
                      ? "rgba(181, 66, 31, 0.08)"
                      : "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span>
                    <strong style={{ display: "block" }}>{role.name}</strong>
                    <small style={{ color: "var(--muted)" }}>{role.code}</small>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

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
          <Link href="/admin/usuarios" style={secondaryButtonStyle}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting || isLoadingRoles} style={primaryButtonStyle}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar usuario"
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

function formatStatus(status: UserFormState["status"]) {
  const labels: Record<UserFormState["status"], string> = {
    ACTIVE: "Ativo",
    INVITED: "Convidado",
    BLOCKED: "Bloqueado",
  };

  return labels[status];
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
