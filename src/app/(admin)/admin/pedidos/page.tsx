"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderListItem = {
  id: string;
  code: string;
  status: string;
  productionStatus: string;
  customerName: string;
  totalAmount: number;
  deliveryDate?: string | null;
  createdAt: string;
};

type OrdersResponse = {
  success: boolean;
  message?: string;
  data?: OrderListItem[];
};

export default function PedidosPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const feedback = searchParams.get("feedback");

    if (feedback === "updated") {
      setSuccessMessage("Pedido atualizado com sucesso.");
      const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const response = await fetch(`/api/orders${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as OrdersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os pedidos.");
          setOrders([]);
          return;
        }

        setOrders(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os pedidos.");
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadOrders, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  const stats = useMemo(() => {
    const open = orders.filter((order) => order.status === "OPEN").length;
    const inProgress = orders.filter((order) => order.status === "IN_PROGRESS").length;
    const ready = orders.filter((order) => order.productionStatus === "READY").length;
    const total = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return [
      { label: "Pedidos", value: String(orders.length), description: "Volume operacional ativo." },
      { label: "Abertos", value: String(open), description: "Pedidos aguardando tratamento." },
      { label: "Em producao", value: String(inProgress), description: "Execucao em andamento." },
      { label: "Valor total", value: formatCurrency(total), description: "Carteira de pedidos listada." },
    ];
  }, [orders]);

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
              Operacao comercial
            </p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Pedidos
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Acompanhe o que saiu do orçamento e entrou em execução, com visão de cliente, prazo e produção.
            </p>
          </div>

          <Link href="/admin/pedidos/novo" style={primaryButtonStyle}>
            Novo pedido
          </Link>
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
            <h2 style={{ margin: 0 }}>Pedidos cadastrados</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Busque por codigo do pedido ou nome do cliente.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pedido..."
            style={{ ...inputStyle, width: "100%", maxWidth: 340, background: "#fff" }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
        {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

        {isLoading ? (
          <div style={{ ...emptyStateStyle, minHeight: 220 }}>
            <strong>Carregando pedidos...</strong>
            <span style={{ color: "var(--muted)" }}>Estamos consultando a base operacional.</span>
          </div>
        ) : orders.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum pedido encontrado.</strong>
            <span style={{ color: "var(--muted)" }}>Crie o primeiro pedido ou refine a busca.</span>
            <Link href="/admin/pedidos/novo" style={secondaryButtonStyle}>
              Criar pedido
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {orders.map((order) => (
              <article
                key={order.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 24 }}>{order.code}</h3>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    Cadastro em {formatDate(order.createdAt)}
                  </p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Cliente</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{order.customerName}</p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Entrega</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {order.deliveryDate ? formatDate(order.deliveryDate) : "Sem data definida"}
                  </p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Valor</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>

                <div style={statusBadgeStyle(order.productionStatus)}>{formatProductionStatus(order.productionStatus)}</div>

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
                    {formatOrderStatus(order.status)} | {formatProductionStatus(order.productionStatus)}
                  </span>
                  <Link href={`/admin/pedidos/${order.id}`} style={secondaryButtonStyle}>
                    Editar pedido
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatOrderStatus(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    CANCELED: "Cancelado",
  };

  return labels[status] ?? status;
}

function formatProductionStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    IN_PRODUCTION: "Em producao",
    WAITING_APPROVAL: "Aguardando aprovacao",
    READY: "Pronto",
    DELIVERED: "Entregue",
  };

  return labels[status] ?? status;
}

function statusBadgeStyle(status: string) {
  const colorMap: Record<string, { background: string; color: string }> = {
    READY: { background: "rgba(43, 110, 82, 0.12)", color: "#245844" },
    DELIVERED: { background: "rgba(43, 110, 82, 0.12)", color: "#245844" },
    IN_PRODUCTION: { background: "rgba(191, 132, 25, 0.12)", color: "#8d5a0a" },
    WAITING_APPROVAL: { background: "rgba(191, 132, 25, 0.12)", color: "#8d5a0a" },
    PENDING: { background: "rgba(181, 66, 31, 0.12)", color: "var(--primary)" },
  };

  const palette = colorMap[status] ?? colorMap.PENDING;

  return {
    padding: "10px 12px",
    borderRadius: 999,
    background: palette.background,
    color: palette.color,
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

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
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
