"use client";

import Link from "next/link";

import { OrderForm } from "@/app/(admin)/admin/pedidos/_components/order-form";

export default function NovoPedidoPage() {
  return (
    <main style={{ padding: 32, maxWidth: 1120, display: "grid", gap: 24 }}>
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
            Operacao comercial
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Novo pedido
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Gere o pedido manualmente ou aproveite um orcamento que o cliente ja aprovou.
          </p>
        </div>

        <Link href="/admin/pedidos" style={secondaryButtonStyle}>
          Voltar para pedidos
        </Link>
      </div>

      <OrderForm mode="create" />
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
