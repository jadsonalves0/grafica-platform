"use client";

import Link from "next/link";
import { ProductForm } from "@/app/(admin)/admin/estoque/_components/product-form";

export default function NovoItemEstoquePage() {
  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 820 }}>
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
            Catalogo de itens
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Novo item
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Cadastre aqui os produtos, servicos e materias-primas que vao alimentar
            orcamentos, pedidos e movimentacoes de estoque.
          </p>
        </div>

        <Link href="/admin/estoque" style={secondaryButtonStyle}>
          Voltar para estoque
        </Link>
      </div>

      <ProductForm mode="create" />
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
