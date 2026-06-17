"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { RoleForm } from "@/app/(admin)/admin/permissoes/_components/role-form";

type RoleDetail = {
  id: string;
  companyId?: string | null;
  name: string;
  code: string;
  isSystem: boolean;
  permissionCodes: string[];
  createdAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarPerfilPage() {
  const params = useParams<{ roleId: string }>();
  const roleId = params.roleId;

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRole() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/admin/roles/${roleId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<RoleDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o perfil.");
          return;
        }

        setRole(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o perfil.");
      } finally {
        setIsLoading(false);
      }
    }

    loadRole();

    return () => controller.abort();
  }, [roleId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando perfil...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos preparando as permissoes para edicao.</span>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 1100, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 760 }}>
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
            Perfis e permissoes
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar perfil
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Ajuste escopo de acesso por modulo mantendo um mapa claro do que cada equipe pode operar.
          </p>
        </div>

        <Link href="/admin/permissoes" style={secondaryButtonStyle}>
          Voltar para perfis
        </Link>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {role ? (
        <RoleForm
          mode="edit"
          roleId={role.id}
          initialState={{
            name: role.name,
            code: role.code,
            permissionCodes: role.permissionCodes,
          }}
          metadata={{
            createdAt: role.createdAt,
            isSystem: role.isSystem,
          }}
        />
      ) : null}
    </main>
  );
}

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

const loadingPanelStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  padding: 42,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
} as const;
