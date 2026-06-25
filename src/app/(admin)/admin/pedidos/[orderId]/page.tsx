"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { OrderForm } from "@/app/(admin)/admin/pedidos/_components/order-form";
import {
  Alert,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type OrderDetail = {
  id: string;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  code: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  productionStatus: "PENDING" | "IN_PRODUCTION" | "WAITING_APPROVAL" | "READY" | "DELIVERED";
  hasLinkedSale?: boolean;
  linkedSaleEntryId?: string | null;
  readyForSale?: boolean;
  deliveryDate?: string | null;
  totalAmount: number;
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

    void loadOrder();

    return () => controller.abort();
  }, [orderId]);

  if (isLoading) {
    return (
      <main className="admin-page-stack">
        <PageHeader
          title="Editar pedido"
          description="Estamos carregando os dados do pedido para revisao."
          secondaryActions={[
            { href: "/admin/pedidos", label: "Voltar para pedidos" },
          ]}
        />
        <SectionCard title="Carregando pedido">
          <Skeleton lines={8} />
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        title={order?.code ? `Pedido ${order.code}` : "Editar pedido"}
        description="Acompanhe o pedido, a producao e o faturamento sem sair do fluxo comercial."
        primaryAction={
          order?.hasLinkedSale
            ? { href: `/admin/vendas/${order.linkedSaleEntryId}`, label: "Abrir venda" }
            : order?.readyForSale
              ? { href: `/admin/vendas/novo?orderId=${order.id}`, label: "Gerar venda" }
              : undefined
        }
        secondaryActions={[
          ...(order?.linkedSaleEntryId
            ? [{ href: `/admin/financeiro/lancamentos/${order.linkedSaleEntryId}`, label: "Abrir conta a receber" }]
            : []),
          { href: "/admin/pedidos", label: "Voltar para pedidos" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o pedido.">
          {errorMessage}
        </Alert>
      ) : null}

      {order ? (
        <>
          <section className="admin-card-grid">
            <MetricCard label="Cliente" value={order.customerName} description="Responsavel pela operacao." />
            <MetricCard
              label="Entrega"
              value={order.deliveryDate ? formatDate(order.deliveryDate) : "Nao definida"}
              description="Prazo combinado para concluir o pedido."
            />
            <MetricCard label="Total do pedido" value={formatCurrency(order.totalAmount)} description="Valor previsto para faturamento." />
            <MetricCard
              label="Faturamento"
              value={
                order.hasLinkedSale
                  ? "Venda gerada"
                  : order.readyForSale
                    ? "Pronto para faturar"
                    : "Aguardando etapa anterior"
              }
              description={
                order.hasLinkedSale
                  ? "A venda e a conta a receber ja estao vinculadas."
                  : order.readyForSale
                    ? "Gerar venda e revisar pagamento."
                    : "Atualize o andamento antes de faturar."
              }
            />
          </section>

          <SectionCard
            title="Faturamento"
            description="Pedido nao vira receita sozinho. O faturamento nasce pela venda e gera a conta a receber."
          >
            {order.hasLinkedSale && order.linkedSaleEntryId ? (
              <div className="admin-page-stack">
                <div className="admin-summary-list">
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Venda gerada</span>
                    <strong>#{order.linkedSaleEntryId.slice(0, 8).toUpperCase()}</strong>
                  </div>
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Conta a receber</span>
                    <strong>Pendente de acompanhamento no financeiro</strong>
                  </div>
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Status operacional</span>
                    <div className="admin-row">
                      <StatusBadge
                        status={formatCommercialStatus(order.status)}
                        tone={mapCommercialTone(order.status)}
                      />
                      <StatusBadge
                        status={formatProductionStatus(order.productionStatus)}
                        tone={mapProductionTone(order.productionStatus)}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-row">
                  <Link href={`/admin/vendas/${order.linkedSaleEntryId}`} className="admin-button admin-button--primary">
                    Abrir venda
                  </Link>
                  <Link href={`/admin/financeiro/lancamentos/${order.linkedSaleEntryId}`} className="admin-button admin-button--secondary">
                    Abrir conta a receber
                  </Link>
                </div>
              </div>
            ) : order.readyForSale ? (
              <div className="admin-page-stack">
                <Alert variant="info" title="Este pedido esta pronto para faturamento.">
                  Ao gerar a venda, o sistema vai herdar cliente e itens, permitir revisar o pagamento e criar a conta a receber ao concluir.
                </Alert>
                <div className="admin-row">
                  <Link href={`/admin/vendas/novo?orderId=${order.id}`} className="admin-button admin-button--primary">
                    Gerar venda
                  </Link>
                  <Link href="/admin/vendas" className="admin-button admin-button--secondary">
                    Ver fila de vendas
                  </Link>
                </div>
              </div>
            ) : (
              <Alert variant="warning" title="O pedido ainda nao pode ser faturado.">
                Atualize o andamento comercial ou a producao ate que o pedido fique pronto. Quando isso acontecer, a acao de gerar venda aparecera aqui.
              </Alert>
            )}
          </SectionCard>

          <OrderForm mode="edit" order={order} onOrderChanged={setOrder} />
        </>
      ) : null}
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatCommercialStatus(status: OrderDetail["status"]) {
  const labels: Record<OrderDetail["status"], string> = {
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    CANCELED: "Cancelado",
  };

  return labels[status];
}

function formatProductionStatus(status: OrderDetail["productionStatus"]) {
  const labels: Record<OrderDetail["productionStatus"], string> = {
    PENDING: "Pendente",
    IN_PRODUCTION: "Em producao",
    WAITING_APPROVAL: "Aguardando aprovacao",
    READY: "Pronto",
    DELIVERED: "Entregue",
  };

  return labels[status];
}

function mapCommercialTone(status: OrderDetail["status"]) {
  const tones: Record<
    OrderDetail["status"],
    "warning" | "info" | "success" | "danger"
  > = {
    OPEN: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELED: "danger",
  };

  return tones[status];
}

function mapProductionTone(status: OrderDetail["productionStatus"]) {
  const tones: Record<
    OrderDetail["productionStatus"],
    "warning" | "info" | "success"
  > = {
    PENDING: "warning",
    IN_PRODUCTION: "info",
    WAITING_APPROVAL: "warning",
    READY: "success",
    DELIVERED: "success",
  };

  return tones[status];
}
