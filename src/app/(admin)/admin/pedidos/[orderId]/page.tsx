"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { billOrder, type OrderBillingMode } from "@/app/(admin)/admin/pedidos/_components/order-billing-client";
import { OrderForm } from "@/app/(admin)/admin/pedidos/_components/order-form";
import {
  Alert,
  LoadingButton,
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
  linkedSaleStatus?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED" | null;
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [billingState, setBillingState] = useState<OrderBillingMode | null>(null);

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

  async function handleBill(mode: OrderBillingMode) {
    if (!order) {
      return;
    }

    setBillingState(mode);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { response, result } = await billOrder<OrderDetail>(order.id, mode);

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel faturar o pedido.");
        return;
      }

      setOrder(result.data);
      setSuccessMessage(
        result.message ??
          (mode === "PAID"
            ? "Pedido faturado e recebido no ato com sucesso."
            : "Pedido faturado com sucesso."),
      );
    } catch {
      setErrorMessage("Nao foi possivel faturar o pedido. Tente novamente.");
    } finally {
      setBillingState(null);
    }
  }

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

  const secondaryActions: Array<{
    href?: string;
    label: string;
    variant?: "secondary";
    onClick?: () => void;
    disabled?: boolean;
  }> = [{ href: "/admin/pedidos", label: "Voltar para pedidos", variant: "secondary" }];

  if (order?.hasLinkedSale && order.linkedSaleEntryId) {
    secondaryActions.unshift({
      href: `/admin/financeiro/lancamentos/${order.linkedSaleEntryId}`,
      label: order.linkedSaleStatus === "PAID" ? "Abrir financeiro" : "Abrir conta a receber",
      variant: "secondary" as const,
    });
  } else if (order?.readyForSale) {
    secondaryActions.unshift({
      label: "Receber agora",
      variant: "secondary" as const,
      onClick: () => void handleBill("PAID"),
      disabled: billingState !== null,
    });
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
              ? {
                  label: "Faturar pedido",
                  onClick: () => void handleBill("PENDING"),
                  disabled: billingState !== null,
                }
              : undefined
        }
        secondaryActions={secondaryActions}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o pedido.">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

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
              value={resolveBillingState(order)}
              description={describeBillingState(order)}
            />
          </section>

          <SectionCard
            title="Faturamento"
            description="Pedido entregue pode ser faturado aqui mesmo. Se receber no ato, nada fica pendente em contas a receber."
          >
            {order.hasLinkedSale && order.linkedSaleEntryId ? (
              <div className="admin-page-stack">
                <div className="admin-summary-list">
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Venda gerada</span>
                    <strong>#{order.linkedSaleEntryId.slice(0, 8).toUpperCase()}</strong>
                  </div>
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Situacao financeira</span>
                    <StatusBadge
                      status={resolveFinancialStatusLabel(order.linkedSaleStatus)}
                      tone={resolveFinancialStatusTone(order.linkedSaleStatus)}
                    />
                  </div>
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Fluxo atual</span>
                    <strong>
                      {order.linkedSaleStatus === "PAID"
                        ? "Pagamento recebido no ato."
                        : "Acompanhe a baixa no contas a receber."}
                    </strong>
                  </div>
                </div>

                <div className="admin-row">
                  <Link href={`/admin/vendas/${order.linkedSaleEntryId}`} className="admin-button admin-button--primary">
                    Abrir venda
                  </Link>
                  <Link href={`/admin/financeiro/lancamentos/${order.linkedSaleEntryId}`} className="admin-button admin-button--secondary">
                    {order.linkedSaleStatus === "PAID"
                      ? "Abrir financeiro"
                      : "Abrir conta a receber"}
                  </Link>
                </div>
              </div>
            ) : order.readyForSale ? (
              <div className="admin-page-stack">
                <Alert variant="info" title="Pedido pronto para faturamento.">
                  Ao faturar, o sistema registra a venda, baixa o estoque quando houver item fisico e gera o reflexo financeiro automaticamente.
                </Alert>
                <div className="admin-row">
                  <LoadingButton
                    type="button"
                    isLoading={billingState === "PENDING"}
                    loadingLabel="Faturando..."
                    className="admin-button admin-button--primary"
                    onClick={() => void handleBill("PENDING")}
                  >
                    Faturar pedido
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    isLoading={billingState === "PAID"}
                    loadingLabel="Recebendo..."
                    className="admin-button admin-button--secondary"
                    onClick={() => void handleBill("PAID")}
                  >
                    Receber agora
                  </LoadingButton>
                </div>
              </div>
            ) : (
              <Alert variant="warning" title="O pedido ainda nao pode ser faturado.">
                Conclua a entrega primeiro. Quando o pedido ficar entregue, o faturamento direto aparece aqui.
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

function resolveBillingState(order: OrderDetail) {
  if (order.hasLinkedSale) {
    return order.linkedSaleStatus === "PAID" ? "Recebido" : "Faturado";
  }

  return order.readyForSale ? "Aguardando faturamento" : "Aguardando entrega";
}

function describeBillingState(order: OrderDetail) {
  if (order.hasLinkedSale) {
    return order.linkedSaleStatus === "PAID"
      ? "Venda registrada com pagamento no ato."
      : "Venda registrada e pendente no contas a receber.";
  }

  return order.readyForSale
    ? "Ja pode faturar aqui mesmo."
    : "Finalize a entrega antes de faturar.";
}

function resolveFinancialStatusLabel(status: OrderDetail["linkedSaleStatus"]) {
  if (status === "PAID") return "Recebido";
  if (status === "OVERDUE") return "Vencido";
  if (status === "CANCELED") return "Cancelado";
  return "Pendente";
}

function resolveFinancialStatusTone(status: OrderDetail["linkedSaleStatus"]) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "danger" as const;
  if (status === "CANCELED") return "neutral" as const;
  return "warning" as const;
}
