"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { UserForm } from "@/app/(admin)/admin/usuarios/_components/user-form";
import { formatPhone } from "@/lib/forms/br-utils";

type UserDetail = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string | null;
  status: "ACTIVE" | "INVITED" | "BLOCKED";
  isPlatformAdmin: boolean;
  roles: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarUsuarioPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<UserDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o usuario.");
          return;
        }

        setUser(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o usuario.");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    return () => controller.abort();
  }, [userId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando usuario...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos preparando o cadastro para edicao.</span>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
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
            Equipe e acessos
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar usuario
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Ajuste status, telefone e perfis de acesso sem perder o historico da equipe.
          </p>
        </div>

        <Link href="/admin/usuarios" style={secondaryButtonStyle}>
          Voltar para usuarios
        </Link>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {user ? (
        <UserForm
          mode="edit"
          userId={user.id}
          initialState={{
            name: user.name,
            email: user.email,
            phone: formatPhone(user.phone ?? ""),
            password: "",
            status: user.status,
            roleIds: user.roles.map((role) => role.id),
            isPlatformAdmin: user.isPlatformAdmin,
          }}
          metadata={{
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
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
