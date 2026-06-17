"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { OrderForm } from "@/app/(admin)/admin/pedidos/_components/order-form";

type OrderDetail = {
  id: string;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  code: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  productionStatus: "PENDING" | "IN_PRODUCTION" | "WAITING_APPROVAL" | "READY" | "DELIVERED";
  deliveryDate?: string | null;
  notes?: string | null;
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarPedidoPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrder() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<OrderDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o pedido.");
          return;
        }

        setOrder(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o pedido.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();

    return () => controller.abort();
  }, [orderId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando pedido...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos preparando os dados da operacao.</span>
        </section>
      </main>
    );
  }

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
            Editar pedido
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Ajuste entrega, itens e andamento de producao em um unico lugar.
          </p>
        </div>

        <Link href="/admin/pedidos" style={secondaryButtonStyle}>
          Voltar para pedidos
        </Link>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {order ? <OrderForm mode="edit" order={order} /> : null}
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
