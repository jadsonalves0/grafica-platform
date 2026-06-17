"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { normalizeRoleCodeInput } from "@/lib/forms/br-utils";

type PermissionOption = {
  code: string;
  module: string;
  action: string;
};

type RoleFormState = {
  name: string;
  code: string;
  permissionCodes: string[];
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type RoleFormProps = {
  mode: "create" | "edit";
  roleId?: string;
  initialState?: RoleFormState;
  metadata?: {
    createdAt?: string;
    isSystem?: boolean;
  };
};

const defaultState: RoleFormState = {
  name: "",
  code: "",
  permissionCodes: [],
};

export function RoleForm({ mode, roleId, initialState, metadata }: Readonly<RoleFormProps>) {
  const [form, setForm] = useState<RoleFormState>(initialState ?? defaultState);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPermissions() {
      setIsLoadingPermissions(true);

      try {
        const response = await fetch("/api/admin/roles?mode=permissions", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<PermissionOption[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar as permissoes.");
          setPermissions([]);
          return;
        }

        setPermissions(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar as permissoes.");
      } finally {
        setIsLoadingPermissions(false);
      }
    }

    loadPermissions();

    return () => controller.abort();
  }, []);

  function updateField<K extends keyof RoleFormState>(field: K, value: RoleFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function togglePermission(code: string) {
    setForm((current) => ({
      ...current,
      permissionCodes: current.permissionCodes.includes(code)
        ? current.permissionCodes.filter((item) => item !== code)
        : [...current.permissionCodes, code],
    }));
  }

  function validateForm() {
    if (form.name.trim().length < 3) {
      return "Informe o nome do perfil com pelo menos 3 caracteres.";
    }

    if (mode === "create" && normalizeRoleCodeInput(form.code).length < 3) {
      return "Informe um codigo valido para o perfil.";
    }

    if (form.permissionCodes.length === 0) {
      return "Selecione pelo menos uma permissao para o perfil.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (metadata?.isSystem) {
      setErrorMessage("Perfis de sistema estao bloqueados para edicao nesta tela.");
      return;
    }

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
      const endpoint = mode === "create" ? "/api/admin/roles" : `/api/admin/roles/${roleId}`;
      const payload =
        mode === "create"
          ? {
              name: form.name.trim(),
              code: normalizeRoleCodeInput(form.code),
              permissionCodes: form.permissionCodes,
            }
          : {
              name: form.name.trim(),
              permissionCodes: form.permissionCodes,
            };

      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o perfil.");
        return;
      }

      setSuccessMessage(
        mode === "create" ? "Perfil salvo com sucesso." : "Perfil atualizado com sucesso.",
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

  const groupedPermissions = permissions.reduce<Record<string, PermissionOption[]>>((acc, permission) => {
    const key = permission.module;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(permission);
    return acc;
  }, {});

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
          <InfoCard label="Criado em" value={formatDate(metadata.createdAt)} />
          <InfoCard label="Tipo" value={metadata.isSystem ? "Sistema" : "Customizado"} accent={metadata.isSystem} />
        </section>
      ) : null}

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Nome do perfil" required>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              maxLength={120}
              placeholder="Ex.: Comercial interno"
              disabled={Boolean(metadata?.isSystem)}
              style={{ ...inputStyle, opacity: metadata?.isSystem ? 0.72 : 1 }}
            />
          </Field>

          <Field label="Codigo do perfil" required>
            <input
              value={form.code}
              onChange={(event) => updateField("code", normalizeRoleCodeInput(event.target.value))}
              disabled={mode === "edit"}
              maxLength={60}
              placeholder="Ex.: comercial_interno"
              style={{ ...inputStyle, opacity: mode === "edit" ? 0.72 : 1 }}
            />
          </Field>
        </div>

        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 20,
            borderRadius: 20,
            border: "1px solid rgba(232, 217, 202, 0.9)",
            background: "rgba(255,255,255,0.76)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Permissoes por modulo</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Monte o perfil selecionando exatamente o que a pessoa pode acessar.
            </p>
          </div>

          {isLoadingPermissions ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>Carregando permissoes...</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {Object.entries(groupedPermissions).map(([module, items]) => (
                <article
                  key={module}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid var(--border)",
                    background: "#fff",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {module}
                  </p>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {items.map((permission) => (
                      <label
                        key={permission.code}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          background: form.permissionCodes.includes(permission.code)
                            ? "rgba(181, 66, 31, 0.08)"
                            : "rgba(255,255,255,0.7)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.permissionCodes.includes(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          disabled={Boolean(metadata?.isSystem)}
                        />
                        <span>{permission.action}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 10,
            borderTop: "1px solid rgba(232, 217, 202, 0.85)",
          }}
        >
          <Link href="/admin/permissoes" style={secondaryButtonStyle}>
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingPermissions || Boolean(metadata?.isSystem)}
            style={primaryButtonStyle}
          >
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar perfil"
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
        background: accent ? "rgba(181, 66, 31, 0.08)" : "rgba(255,255,255,0.75)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "var(--primary)",
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
