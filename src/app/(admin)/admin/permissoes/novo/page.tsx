"use client";

import Link from "next/link";

import { RoleForm } from "@/app/(admin)/admin/permissoes/_components/role-form";

export default function NovaPermissaoPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--medium">
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
            Governanca de acesso
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Novo perfil de acesso
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Crie um perfil novo agrupando as permissoes exatas para cada funcao da grafica.
          </p>
        </div>

        <Link href="/admin/permissoes" style={secondaryButtonStyle}>
          Voltar para perfis
        </Link>
      </div>

      <RoleForm mode="create" />
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
