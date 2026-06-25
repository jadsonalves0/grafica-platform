"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchField,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type CommercialStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
type ProductionStatus =
  | "PENDING"
  | "IN_PRODUCTION"
  | "WAITING_APPROVAL"
  | "READY"
  | "DELIVERED";

type OrderListItem = {
  id: string;
  code: string;
  status: CommercialStatus;
  productionStatus: ProductionStatus;
  hasLinkedSale?: boolean;
  linkedSaleEntryId?: string | null;
  readyForSale?: boolean;
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

type StatusFilter = "all" | CommercialStatus;
type ProductionFilter = "all" | ProductionStatus;

function readStatusFilter(value: string | null): StatusFilter {
  return value === "OPEN" ||
    value === "IN_PROGRESS" ||
    value === "COMPLETED" ||
    value === "CANCELED"
    ? value
    : "all";
}

function readProductionFilter(value: string | null): ProductionFilter {
  return value === "PENDING" ||
    value === "IN_PRODUCTION" ||
    value === "WAITING_APPROVAL" ||
    value === "READY" ||
    value === "DELIVERED"
    ? value
    : "all";
}

export default function PedidosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    readStatusFilter(searchParams.get("status")),
  );
  const [productionFilter, setProductionFilter] = useState<ProductionFilter>(
    readProductionFilter(searchParams.get("production")),
  );
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

    setSuccessMessage(null);
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setStatusFilter(readStatusFilter(searchParams.get("status")));
    setProductionFilter(readProductionFilter(searchParams.get("production")));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }

    if (statusFilter === "all") {
      params.delete("status");
    } else {
      params.set("status", statusFilter);
    }

    if (productionFilter === "all") {
      params.delete("production");
    } else {
      params.set("production", productionFilter);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, productionFilter, router, search, searchParams, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim()
          ? `?search=${encodeURIComponent(search.trim())}`
          : "";
        const response = await fetch(`/api/orders${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as OrdersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(
            result.message ?? "Nao foi possivel carregar os pedidos.",
          );
          setOrders([]);
          return;
        }

        setOrders(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage(
          "Nao foi possivel carregar os pedidos. Tente novamente.",
        );
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesCommercialStatus =
        statusFilter === "all" ? true : order.status === statusFilter;
      const matchesProductionStatus =
        productionFilter === "all"
          ? true
          : order.productionStatus === productionFilter;

      return matchesCommercialStatus && matchesProductionStatus;
    });
  }, [orders, productionFilter, statusFilter]);

  const stats = useMemo(() => {
    const openOrders = orders.filter((order) => order.status === "OPEN");
    const runningProduction = orders.filter(
      (order) => order.productionStatus === "IN_PRODUCTION",
    );
    const readyToBill = orders.filter(
      (order) => order.readyForSale && !order.hasLinkedSale && order.status !== "CANCELED",
    );
    const billedOrders = orders.filter(
      (order) => order.hasLinkedSale,
    );

    return [
      {
        label: "Pedidos em aberto",
        value: String(openOrders.length),
        description: "Aguardando proxima definicao comercial.",
      },
      {
        label: "Em producao",
        value: String(runningProduction.length),
        description: "Ja em execucao.",
      },
      {
        label: "Prontos para faturar",
        value: String(readyToBill.length),
        description: "Podem virar venda agora.",
      },
      {
        label: "Faturados",
        value: String(billedOrders.length),
        description: "Ja vinculados a uma venda.",
      },
    ];
  }, [orders]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];

    if (statusFilter !== "all") {
      filters.push(`Status: ${formatCommercialStatus(statusFilter)}`);
    }

    if (productionFilter !== "all") {
      filters.push(`Producao: ${formatProductionStatus(productionFilter)}`);
    }

    return filters;
  }, [productionFilter, statusFilter]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Pedidos"
        description="Acompanhe pedidos em aberto, producao e faturamento em um fluxo mais direto."
        primaryAction={{ href: "/admin/pedidos/novo", label: "Novo pedido" }}
      />

      <section className="admin-card-grid">
        {stats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.description}
          />
        ))}
      </section>

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar os pedidos.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Pedidos cadastrados"
      >
        <FilterBar
          resultsCount={filteredOrders.length}
          activeFilters={activeFilters}
          onClear={
            search || statusFilter !== "all" || productionFilter !== "all"
              ? () => {
                  setSearch("");
                  setStatusFilter("all");
                  setProductionFilter("all");
                }
              : undefined
          }
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar pedido ou cliente"
            label="Buscar pedido ou cliente"
            autoFocus
          />
          <label className="admin-field">
            <span className="admin-field__label">Status comercial</span>
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(readStatusFilter(event.target.value))
              }
            >
              <option value="all">Todos</option>
              <option value="OPEN">Aberto</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluido</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-field__label">Producao</span>
            <select
              className="admin-select"
              value={productionFilter}
              onChange={(event) =>
                setProductionFilter(readProductionFilter(event.target.value))
              }
            >
              <option value="all">Todas</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PRODUCTION">Em producao</option>
              <option value="WAITING_APPROVAL">Aguardando aprovacao</option>
              <option value="READY">Pronto</option>
              <option value="DELIVERED">Entregue</option>
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Crie o primeiro pedido ou ajuste os filtros para localizar uma operacao existente."
            action={{ href: "/admin/pedidos/novo", label: "Criar pedido" }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredOrders.map((order) => (
              <article key={order.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{order.code}</strong>
                    <span className="admin-list-card__subtitle">
                      {order.customerName}
                    </span>
                  </div>
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

                <div className="admin-list-card__meta">
                  <InfoBox
                    label="Entrega"
                    value={
                      order.deliveryDate
                        ? formatDate(order.deliveryDate)
                        : "Sem prazo definido"
                    }
                  />
                  <InfoBox
                    label="Total"
                    value={formatCurrency(order.totalAmount)}
                  />
                  <InfoBox
                    label="Cadastro"
                    value={formatDate(order.createdAt)}
                  />
                  <InfoBox
                    label="Proxima acao"
                    value={resolveNextActionLabel(order)}
                  />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    {order.hasLinkedSale
                      ? "O pedido ja possui venda e conta a receber vinculadas. Use os atalhos para acompanhar o comercial ou o financeiro."
                      : order.readyForSale
                        ? "O pedido esta pronto para faturamento. Gere a venda para revisar pagamento e refletir no financeiro."
                        : "Atualize o andamento, revise a producao ou siga para a proxima etapa valida."}
                  </span>
                  <div className="admin-row">
                    {order.hasLinkedSale && order.linkedSaleEntryId ? (
                      <>
                        <Link
                          href={`/admin/vendas/${order.linkedSaleEntryId}`}
                          className="admin-button admin-button--primary"
                        >
                          Abrir venda
                        </Link>
                        <Link
                          href={`/admin/financeiro/lancamentos/${order.linkedSaleEntryId}`}
                          className="admin-button admin-button--secondary"
                        >
                          Abrir conta
                        </Link>
                      </>
                    ) : order.readyForSale ? (
                      <Link
                        href={`/admin/vendas/novo?orderId=${order.id}`}
                        className="admin-button admin-button--primary"
                      >
                        Gerar venda
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="admin-button admin-button--secondary"
                    >
                      Abrir pedido
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function InfoBox({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
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

function resolveNextActionLabel(order: OrderListItem) {
  if (order.hasLinkedSale) {
    return "Abrir venda";
  }

  if (order.readyForSale) {
    return "Gerar venda";
  }

  if (order.productionStatus === "IN_PRODUCTION") {
    return "Atualizar producao";
  }

  if (order.status === "OPEN") {
    return "Acompanhar pedido";
  }

  return "Revisar andamento";
}

function formatCommercialStatus(status: CommercialStatus) {
  const labels: Record<CommercialStatus, string> = {
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    CANCELED: "Cancelado",
  };

  return labels[status];
}

function formatProductionStatus(status: ProductionStatus) {
  const labels: Record<ProductionStatus, string> = {
    PENDING: "Pendente",
    IN_PRODUCTION: "Em producao",
    WAITING_APPROVAL: "Aguardando aprovacao",
    READY: "Pronto",
    DELIVERED: "Entregue",
  };

  return labels[status];
}

function mapCommercialTone(status: CommercialStatus) {
  const tones: Record<
    CommercialStatus,
    "warning" | "info" | "success" | "danger"
  > = {
    OPEN: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELED: "danger",
  };

  return tones[status];
}

function mapProductionTone(status: ProductionStatus) {
  const tones: Record<
    ProductionStatus,
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
