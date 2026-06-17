"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserListItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  isPlatformAdmin: boolean;
  roles: Array<{
    id: string;
    name: string;
    code: string;
  }>;
};

type UsersResponse = {
  success: boolean;
  message?: string;
  data?: UserListItem[];
};

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/users", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as UsersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os usuarios.");
          setUsers([]);
          return;
        }

        setUsers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os usuarios.");
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();

    return () => controller.abort();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.phone ?? "", user.roles.map((role) => role.name).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [search, users]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === "ACTIVE").length;
    const invited = users.filter((user) => user.status === "INVITED").length;
    const admins = users.filter((user) => user.isPlatformAdmin).length;

    return [
      { label: "Usuarios", value: String(users.length), description: "Pessoas com acesso a plataforma." },
      { label: "Ativos", value: String(active), description: "Acessos liberados no momento." },
      { label: "Convidados", value: String(invited), description: "Usuarios aguardando ativacao." },
      { label: "Admins", value: String(admins), description: "Perfis com escopo ampliado." },
    ];
  }, [users]);

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          padding: 28,
          borderRadius: 28,
          background:
            "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
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
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Usuarios
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Gerencie quem entra no sistema, quais perfis cada pessoa carrega e qual o estado atual do acesso.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/usuarios/novo" style={primaryButtonStyle}>
              Novo usuario
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          {stats.map((stat) => (
            <article
              key={stat.label}
              style={{
                padding: 20,
                borderRadius: 22,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(232, 217, 202, 0.9)",
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
                {stat.label}
              </p>
              <h2 style={{ margin: "10px 0 6px", fontSize: 34 }}>{stat.value}</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{stat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Base de acessos</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Busque por nome, e-mail, telefone ou perfil.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar usuario..."
            style={{ ...inputStyle, width: "100%", maxWidth: 340, background: "#fff" }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

        {isLoading ? (
          <div style={{ ...emptyStateStyle, minHeight: 220 }}>
            <strong>Carregando usuarios...</strong>
            <span style={{ color: "var(--muted)" }}>Estamos consultando os acessos da empresa.</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum usuario encontrado.</strong>
            <span style={{ color: "var(--muted)" }}>Cadastre a primeira pessoa ou refine a busca.</span>
            <Link href="/admin/usuarios/novo" style={secondaryButtonStyle}>
              Cadastrar usuario
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredUsers.map((user) => (
              <article
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1.4fr) minmax(0, 1fr) auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 24 }}>{user.name}</h3>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{user.email}</p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Perfis</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {user.roles.map((role) => role.name).join(", ") || "Sem perfis"}
                  </p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Telefone</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {user.phone || "Nao informado"}
                  </p>
                </div>

                <div style={statusBadgeStyle(user.status)}>
                  {formatStatus(user.status)}
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(232, 217, 202, 0.85)",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    {user.isPlatformAdmin ? "Administrador da plataforma" : "Usuario da empresa"}
                  </span>
                  <Link href={`/admin/usuarios/${user.id}`} style={secondaryButtonStyle}>
                    Editar usuario
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INVITED: "Convidado",
    BLOCKED: "Bloqueado",
  };

  return labels[status] ?? status;
}

function statusBadgeStyle(status: string) {
  const isActive = status === "ACTIVE";
  const isInvited = status === "INVITED";

  return {
    padding: "10px 12px",
    borderRadius: 999,
    background: isActive
      ? "rgba(43, 110, 82, 0.12)"
      : isInvited
        ? "rgba(191, 132, 25, 0.12)"
        : "rgba(167, 45, 45, 0.12)",
    color: isActive ? "#245844" : isInvited ? "#8d5a0a" : "#8b2323",
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
    justifySelf: "end",
  };
}

const inputStyle = {
  height: 50,
  padding: "0 16px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "#fff",
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
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const secondaryButtonStyle = {
  height: 42,
  padding: "0 16px",
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

const emptyStateStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  textAlign: "center" as const,
  padding: 36,
  borderRadius: 22,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.6)",
} as const;
