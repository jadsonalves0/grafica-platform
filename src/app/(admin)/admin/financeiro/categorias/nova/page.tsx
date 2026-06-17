"use client";

import Link from "next/link";

import { FinancialCategoryForm } from "@/app/(admin)/admin/financeiro/categorias/_components/financial-category-form";

export default function NovaCategoriaFinanceiraPage() {
  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 760 }}>
          <p style={eyebrowStyle}>Base financeira</p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Nova categoria financeira
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Cadastre categorias de receita e despesa para padronizar os lancamentos.
          </p>
        </div>

        <Link href="/admin/financeiro/categorias" style={secondaryButtonStyle}>
          Voltar para categorias
        </Link>
      </div>

      <FinancialCategoryForm mode="create" />
    </main>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
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
