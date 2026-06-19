"use client";

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
        description="Revise cliente, entrega, itens e andamento operacional a partir de um unico ponto de controle."
        secondaryActions={[
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
            <MetricCard label="Cliente" value={order.customerName} />
            <MetricCard
              label="Entrega"
              value={order.deliveryDate ? formatDate(order.deliveryDate) : "Nao definida"}
            />
            <MetricCard label="Itens" value={String(order.items.length)} />
            <div>
              <SectionCard title="Situacao atual">
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
              </SectionCard>
            </div>
          </section>

          <OrderForm mode="edit" order={order} />
        </>
      ) : null}
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
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
