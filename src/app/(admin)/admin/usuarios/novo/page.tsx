"use client";

import Link from "next/link";

import { UserForm } from "@/app/(admin)/admin/usuarios/_components/user-form";

export default function NovoUsuarioPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
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
            Novo usuario
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Convide uma nova pessoa para operar a plataforma com os perfis adequados.
          </p>
        </div>

        <Link href="/admin/usuarios" style={secondaryButtonStyle}>
          Voltar para usuarios
        </Link>
      </div>

      <UserForm mode="create" />
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
