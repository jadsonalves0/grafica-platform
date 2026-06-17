"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RoleListItem = {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  permissionCodes: string[];
};

type RolesResponse = {
  success: boolean;
  message?: string;
  data?: RoleListItem[];
};

export default function PermissoesPage() {
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoles() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/roles", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as RolesResponse;

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

        setErrorMessage("Falha ao consultar os perfis.");
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadRoles();

    return () => controller.abort();
  }, []);

  const filteredRoles = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return roles;
    }

    return roles.filter((role) =>
      [role.name, role.code, role.permissionCodes.join(" ")].join(" ").toLowerCase().includes(normalized),
    );
  }, [search, roles]);

  const stats = useMemo(() => {
    const system = roles.filter((role) => role.isSystem).length;
    const custom = roles.filter((role) => !role.isSystem).length;
    const totalPermissions = roles.reduce((sum, role) => sum + role.permissionCodes.length, 0);

    return [
      { label: "Perfis", value: String(roles.length), description: "Modelos de acesso cadastrados." },
      { label: "Sistema", value: String(system), description: "Perfis nativos da plataforma." },
      { label: "Customizados", value: String(custom), description: "Perfis criados para a operacao." },
      { label: "Escopos", value: String(totalPermissions), description: "Permissoes somadas entre os perfis." },
    ];
  }, [roles]);

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
              Governanca de acesso
            </p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Perfis e permissoes
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Visualize quem pode fazer o que dentro da plataforma e crie perfis mais aderentes a cada grafica.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/permissoes/novo" style={primaryButtonStyle}>
              Novo perfil
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
            <h2 style={{ margin: 0 }}>Perfis cadastrados</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Busque por nome do perfil, codigo ou permissao.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar perfil..."
            style={{ ...inputStyle, width: "100%", maxWidth: 340, background: "#fff" }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

        {isLoading ? (
          <div style={{ ...emptyStateStyle, minHeight: 220 }}>
            <strong>Carregando perfis...</strong>
            <span style={{ color: "var(--muted)" }}>Estamos consultando os acessos disponiveis.</span>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum perfil encontrado.</strong>
            <span style={{ color: "var(--muted)" }}>Crie um perfil novo ou refine a busca.</span>
            <Link href="/admin/permissoes/novo" style={secondaryButtonStyle}>
              Cadastrar perfil
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredRoles.map((role) => (
              <article
                key={role.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr) auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 24 }}>{role.name}</h3>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{role.code}</p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Permissoes</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {role.permissionCodes.length} liberacoes configuradas
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: role.isSystem ? "rgba(181, 66, 31, 0.08)" : "rgba(43, 110, 82, 0.12)",
                    color: role.isSystem ? "var(--primary)" : "#245844",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    justifySelf: "end",
                  }}
                >
                  {role.isSystem ? "Sistema" : "Customizado"}
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
                    {role.permissionCodes.slice(0, 4).join(", ")}
                    {role.permissionCodes.length > 4 ? "..." : ""}
                  </span>
                  <Link href={`/admin/permissoes/${role.id}`} style={secondaryButtonStyle}>
                    Editar perfil
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
