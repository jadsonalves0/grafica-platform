"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  Tabs,
} from "@/components/admin/ui";

type CustomerRow = {
  id: string;
  name: string;
  isActive: boolean;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
};

type QuoteRow = {
  id: string;
  code: string;
  status: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  issueDate: string;
  validUntil?: string | null;
};

type OrderRow = {
  id: string;
  code: string;
  status: string;
  productionStatus: string;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  totalAmount: number;
  deliveryDate?: string | null;
  createdAt: string;
};

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

type MovementRow = {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string | null;
  createdAt: string;
};

type FinancialEntryRow = {
  id: string;
  accountId: string;
  accountName: string;
  financialCategoryId?: string | null;
  entryType: string;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  itemCount: number;
};

type LeadRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  subject?: string | null;
  requestedService?: string | null;
  status: string;
  createdAt: string;
};

type ProductionRow = {
  id: string;
  productId: string;
  productName: string;
  quantityProduced: number;
  totalCost: number;
  unitCost: number;
  notes?: string | null;
  createdAt: string;
  producedByName?: string | null;
  consumptions: Array<{
    materialProductId: string;
    materialProductName: string;
    quantityConsumed: number;
    unitCost: number;
    totalCost: number;
  }>;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ReportData = {
  customers: CustomerRow[];
  quotes: QuoteRow[];
  orders: OrderRow[];
  products: ProductRow[];
  movements: MovementRow[];
  entries: FinancialEntryRow[];
  leads: LeadRow[];
  productions: ProductionRow[];
};

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState("comercial");
  const [data, setData] = useState<ReportData>({
    customers: [],
    quotes: [],
    orders: [],
    products: [],
    movements: [],
    entries: [],
    leads: [],
    productions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [
          customersResponse,
          quotesResponse,
          ordersResponse,
          productsResponse,
          movementsResponse,
          entriesResponse,
          leadsResponse,
          productionsResponse,
        ] = await Promise.all([
          fetch("/api/customers?includeInactive=true", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/quotes", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/orders", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/inventory/products", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/inventory/movements", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/financial/entries", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/site/leads", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/production", { signal: controller.signal, cache: "no-store" }),
        ]);

        const [customersResult, quotesResult, ordersResult, productsResult, movementsResult, entriesResult, leadsResult, productionsResult] =
          (await Promise.all([
            customersResponse.json(),
            quotesResponse.json(),
            ordersResponse.json(),
            productsResponse.json(),
            movementsResponse.json(),
            entriesResponse.json(),
            leadsResponse.json(),
            productionsResponse.json(),
          ])) as [
            ApiResult<CustomerRow[]>,
            ApiResult<QuoteRow[]>,
            ApiResult<OrderRow[]>,
            ApiResult<ProductRow[]>,
            ApiResult<MovementRow[]>,
            ApiResult<FinancialEntryRow[]>,
            ApiResult<LeadRow[]>,
            ApiResult<ProductionRow[]>,
          ];

        const checks = [
          [customersResponse, customersResult, "clientes"],
          [quotesResponse, quotesResult, "orcamentos"],
          [ordersResponse, ordersResult, "pedidos"],
          [productsResponse, productsResult, "itens"],
          [movementsResponse, movementsResult, "movimentacoes"],
          [entriesResponse, entriesResult, "financeiro"],
          [leadsResponse, leadsResult, "leads"],
          [productionsResponse, productionsResult, "producao"],
        ] as const;

        for (const [response, result, label] of checks) {
          if (!response.ok || !result.success || !result.data) {
            setErrorMessage(result.message ?? `Nao foi possivel carregar os dados de ${label}.`);
            return;
          }
        }

        setData({
          customers: customersResult.data ?? [],
          quotes: quotesResult.data ?? [],
          orders: ordersResult.data ?? [],
          products: productsResult.data ?? [],
          movements: movementsResult.data ?? [],
          entries: entriesResult.data ?? [],
          leads: leadsResult.data ?? [],
          productions: productionsResult.data ?? [],
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consolidar os relatorios.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadReports();

    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const approvedQuotes = data.quotes.filter((quote) => quote.status === "APPROVED").length;
    const openOrders = data.orders.filter((order) => order.status !== "COMPLETED" && order.status !== "CANCELED").length;
    const lowStock = data.products.filter((product) => product.currentStock <= product.minimumStock).length;
    const pendingIncome = data.entries
      .filter((entry) => entry.entryType === "INCOME" && entry.status === "PENDING")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const overdueExpense = data.entries
      .filter((entry) => entry.entryType === "EXPENSE" && entry.status === "OVERDUE")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const itemizedSales = data.entries.filter((entry) => entry.entryType === "INCOME" && entry.itemCount > 0).length;

    return {
      approvedQuotes,
      openOrders,
      lowStock,
      pendingIncome,
      overdueExpense,
      itemizedSales,
    };
  }, [data.entries, data.orders, data.products, data.quotes]);

  const tabs = [
    { id: "comercial", label: "Comercial" },
    { id: "estoque", label: "Estoque" },
    { id: "producao", label: "Producao" },
    { id: "financeiro", label: "Financeiro" },
    { id: "leads", label: "Leads" },
  ];

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Central de relatorios"
        description="Consulte os principais recortes operacionais por area e exporte rapidamente os dados."
      />

      <section className="admin-card-grid">
        <MetricCard label="Orcamentos aprovados" value={String(summary.approvedQuotes)} />
        <MetricCard label="Pedidos em aberto" value={String(summary.openOrders)} />
        <MetricCard label="Itens abaixo do minimo" value={String(summary.lowStock)} />
        <MetricCard label="Receita pendente" value={formatCurrency(summary.pendingIncome)} />
        <MetricCard label="Despesa vencida" value={formatCurrency(summary.overdueExpense)} />
        <MetricCard label="Vendas com itens" value={String(summary.itemizedSales)} />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel consolidar os relatorios">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Categorias de relatorio"
      >
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {isLoading ? (
          <Skeleton lines={8} />
        ) : (
          <>
            {activeTab === "comercial" ? (
              <div className="admin-page-stack">
                <ReportSection
                  title="Orcamentos e pedidos"
                  description="Carteira comercial recente com valor, cliente e situacao."
                  actionLabel="Exportar comercial"
                  onAction={() =>
                    exportCsv("comercial", [
                      ...data.quotes.map((quote) => ({ bloco: "orcamento", ...quote })),
                      ...data.orders.map((order) => ({ bloco: "pedido", ...order })),
                    ])
                  }
                  rows={[
                    ...data.quotes.slice(0, 5).map((quote) => ({
                      title: quote.code,
                      subtitle: `${quote.customerName} | ${formatQuoteStatus(quote.status)}`,
                      value: formatCurrency(quote.totalAmount),
                      meta: formatDate(quote.issueDate),
                    })),
                    ...data.orders.slice(0, 5).map((order) => ({
                      title: order.code,
                      subtitle: `${order.customerName} | ${formatOrderStatus(order.status)}`,
                      value: formatCurrency(order.totalAmount),
                      meta: formatDate(order.createdAt),
                    })),
                  ]}
                  emptyText="Nenhum dado comercial encontrado."
                />
              </div>
            ) : null}

            {activeTab === "estoque" ? (
              <ReportSection
                title="Posicao e movimentacoes"
                description="Itens com risco de ruptura e movimentacoes recentes."
                actionLabel="Exportar estoque"
                onAction={() =>
                  exportCsv("estoque", [
                    ...data.products.map((product) => ({ bloco: "item", ...product })),
                    ...data.movements.map((movement) => ({ bloco: "movimentacao", ...movement })),
                  ])
                }
                rows={[
                  ...data.products
                    .filter((product) => product.currentStock <= product.minimumStock)
                    .slice(0, 5)
                    .map((product) => ({
                      title: product.name,
                      subtitle: `${formatType(product.type)} | minimo ${formatNumber(product.minimumStock)}`,
                      value: formatNumber(product.currentStock),
                      meta: formatCurrency(product.costPrice),
                    })),
                  ...data.movements.slice(0, 5).map((movement) => ({
                    title: movement.productName,
                    subtitle: movement.movementType,
                    value: formatNumber(movement.quantity),
                    meta: formatDate(movement.createdAt),
                  })),
                ]}
                emptyText="Nenhum dado de estoque encontrado."
              />
            ) : null}

            {activeTab === "producao" ? (
              <ReportSection
                title="Producoes"
                description="Ultimos apontamentos de producao e custo unitario gerado."
                actionLabel="Exportar producao"
                onAction={() => exportCsv("producao", data.productions)}
                rows={data.productions.slice(0, 8).map((production) => ({
                  title: production.productName,
                  subtitle: `${production.consumptions.length} materiais consumidos`,
                  value: formatCurrency(production.totalCost),
                  meta: `${formatNumber(production.quantityProduced)} un. | ${formatDate(production.createdAt)}`,
                }))}
                emptyText="Nenhuma producao registrada."
              />
            ) : null}

            {activeTab === "financeiro" ? (
              <ReportSection
                title="Lancamentos financeiros"
                description="Receitas e despesas recentes com status e categoria."
                actionLabel="Exportar financeiro"
                onAction={() => exportCsv("financeiro", data.entries)}
                rows={data.entries.slice(0, 10).map((entry) => ({
                  title: entry.description || "Lancamento financeiro",
                  subtitle: `${entry.accountName} | ${entry.category}`,
                  value: formatCurrency(entry.amount),
                  meta: `${formatEntryType(entry.entryType)} | ${formatFinancialStatus(entry.status)}`,
                }))}
                emptyText="Nenhum lancamento financeiro encontrado."
              />
            ) : null}

            {activeTab === "leads" ? (
              <ReportSection
                title="Leads do site"
                description="Leads mais recentes para acompanhamento de conversao."
                actionLabel="Exportar leads"
                onAction={() => exportCsv("leads", data.leads)}
                rows={data.leads.slice(0, 10).map((lead) => ({
                  title: lead.name,
                  subtitle: lead.requestedService || lead.subject || "Contato geral",
                  value: formatLeadStatus(lead.status),
                  meta: formatDate(lead.createdAt),
                }))}
                emptyText="Nenhum lead recebido."
              />
            ) : null}
          </>
        )}
      </SectionCard>
    </main>
  );
}

function ReportSection({
  title,
  description,
  actionLabel,
  onAction,
  rows,
  emptyText,
}: Readonly<{
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  rows: Array<{ title: string; subtitle: string; value: string; meta: string }>;
  emptyText: string;
}>) {
  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        <button type="button" className="admin-button admin-button--secondary" onClick={onAction}>
          {actionLabel}
        </button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="Sem resultados" description={emptyText} />
      ) : (
        <div className="admin-list-stack">
          {rows.map((row, index) => (
            <article key={`${row.title}-${index}`} className="admin-list-card">
              <div className="admin-list-card__header">
                <div className="admin-list-card__heading">
                  <strong className="admin-list-card__title">{row.title}</strong>
                  <span className="admin-list-card__subtitle">{row.subtitle}</span>
                </div>
                <div className="admin-list-card__heading" style={{ textAlign: "right" }}>
                  <strong className="admin-list-card__title">{row.value}</strong>
                  <span className="admin-list-card__subtitle">{row.meta}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function exportCsv(fileName: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return;
  }

  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const csv = [
    keys.join(";"),
    ...rows.map((row) =>
      keys
        .map((key) => {
          const raw = row[key];
          const value =
            raw == null
              ? ""
              : typeof raw === "object"
                ? JSON.stringify(raw)
                : String(raw);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(";"),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    RAW_MATERIAL: "Materia-prima",
    SERVICE: "Servico",
    FINISHED_PRODUCT: "Produto final",
    RESALE: "Revenda",
  };
  return labels[type] ?? type;
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

function formatLeadStatus(status: string) {
  const labels: Record<string, string> = {
    NEW: "Novo",
    CONTACTED: "Em atendimento",
    CONVERTED: "Convertido",
    ARCHIVED: "Arquivado",
  };
  return labels[status] ?? status;
}

function formatFinancialStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELED: "Cancelado",
  };
  return labels[status] ?? status;
}

function formatEntryType(type: string) {
  return type === "INCOME" ? "Receita" : "Despesa";
}

function formatQuoteStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
    EXPIRED: "Expirado",
  };
  return labels[status] ?? status;
}
