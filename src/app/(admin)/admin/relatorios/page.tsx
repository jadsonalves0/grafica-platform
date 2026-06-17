"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
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

    loadReports();

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

  const lowStockItems = useMemo(
    () => data.products.filter((product) => product.currentStock <= product.minimumStock).slice(0, 6),
    [data.products],
  );

  const recentOrders = useMemo(() => data.orders.slice(0, 6), [data.orders]);
  const recentFinancialEntries = useMemo(() => data.entries.slice(0, 6), [data.entries]);
  const recentProductions = useMemo(() => data.productions.slice(0, 6), [data.productions]);
  const recentLeads = useMemo(() => data.leads.slice(0, 6), [data.leads]);

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section style={heroPanelStyle}>
        <div style={{ display: "grid", gap: 10, maxWidth: 840 }}>
          <p style={eyebrowStyle}>Gestao e auditoria</p>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Relatorios
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Consolide comercial, operacao, producao, estoque, financeiro e leads em um unico painel, com exportacao rapida para analise externa.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={secondaryButtonStyle}>
            Voltar para dashboard
          </Link>
          <button type="button" onClick={() => exportCsv("clientes", data.customers)} style={primaryButtonStyle}>
            Exportar base de clientes
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
        }}
      >
        <SummaryCard label="Orcamentos aprovados" value={String(summary.approvedQuotes)} />
        <SummaryCard label="Pedidos em aberto" value={String(summary.openOrders)} />
        <SummaryCard label="Itens com estoque baixo" value={String(summary.lowStock)} />
        <SummaryCard label="Receita pendente" value={formatCurrency(summary.pendingIncome)} accent />
        <SummaryCard label="Despesa vencida" value={formatCurrency(summary.overdueExpense)} />
        <SummaryCard label="Vendas avulsas lancadas" value={String(summary.itemizedSales)} />
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {isLoading ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando relatorios...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos reunindo os dados de todos os modulos.</span>
        </section>
      ) : (
        <>
          <section style={sectionStyle}>
            <SectionHeader
              title="Comercial"
              description="Leads, clientes, orcamentos e pedidos para acompanhar conversao e carteira."
              actionLabel="Exportar comercial"
              onAction={() =>
                exportCsv("comercial", [
                  ...data.leads.map((lead) => ({ origem: "lead", ...lead })),
                  ...data.customers.map((customer) => ({ origem: "cliente", ...customer })),
                  ...data.quotes.map((quote) => ({ origem: "orcamento", ...quote })),
                  ...data.orders.map((order) => ({ origem: "pedido", ...order })),
                ])
              }
            />

            <div style={gridTwoColumnsStyle}>
              <ReportCard
                title="Pedidos recentes"
                rows={recentOrders}
                emptyText="Nenhum pedido registrado."
                renderRow={(order) => (
                  <div style={rowStyle}>
                    <div>
                      <strong>{order.code}</strong>
                      <span style={rowMetaStyle}>{order.customerName}</span>
                    </div>
                    <div>
                      <strong>{formatCurrency(order.totalAmount)}</strong>
                      <span style={rowMetaStyle}>{formatOrderStatus(order.status)} | {formatProductionStatus(order.productionStatus)}</span>
                    </div>
                  </div>
                )}
              />

              <ReportCard
                title="Leads recentes"
                rows={recentLeads}
                emptyText="Nenhum lead recebido ainda."
                renderRow={(lead) => (
                  <div style={rowStyle}>
                    <div>
                      <strong>{lead.name}</strong>
                      <span style={rowMetaStyle}>{lead.requestedService || lead.subject || "Contato comercial"}</span>
                    </div>
                    <div>
                      <strong>{formatLeadStatus(lead.status)}</strong>
                      <span style={rowMetaStyle}>{formatDate(lead.createdAt)}</span>
                    </div>
                  </div>
                )}
              />
            </div>
          </section>

          <section style={sectionStyle}>
            <SectionHeader
              title="Operacao e producao"
              description="Itens com risco de ruptura, movimentacoes recentes e lotes produzidos."
              actionLabel="Exportar operacao"
              onAction={() =>
                exportCsv("operacao", [
                  ...data.products.map((product) => ({ bloco: "item", ...product })),
                  ...data.movements.map((movement) => ({ bloco: "movimentacao", ...movement })),
                  ...data.productions.map((production) => ({ bloco: "producao", ...production })),
                ])
              }
            />

            <div style={gridTwoColumnsStyle}>
              <ReportCard
                title="Estoque em reposicao"
                rows={lowStockItems}
                emptyText="Nenhum item abaixo do minimo."
                renderRow={(product) => (
                  <div style={rowStyle}>
                    <div>
                      <strong>{product.name}</strong>
                      <span style={rowMetaStyle}>{formatType(product.type)} | {product.unit}</span>
                    </div>
                    <div>
                      <strong>{formatNumber(product.currentStock)}</strong>
                      <span style={rowMetaStyle}>Minimo {formatNumber(product.minimumStock)}</span>
                    </div>
                  </div>
                )}
              />

              <ReportCard
                title="Producoes recentes"
                rows={recentProductions}
                emptyText="Nenhuma producao registrada."
                renderRow={(production) => (
                  <div style={rowStyle}>
                    <div>
                      <strong>{production.productName}</strong>
                      <span style={rowMetaStyle}>{production.consumptions.length} materiais consumidos</span>
                    </div>
                    <div>
                      <strong>{formatNumber(production.quantityProduced)}</strong>
                      <span style={rowMetaStyle}>{formatCurrency(production.totalCost)}</span>
                    </div>
                  </div>
                )}
              />
            </div>
          </section>

          <section style={sectionStyle}>
            <SectionHeader
              title="Financeiro"
              description="Fluxo de caixa com receitas, despesas e vendas avulsas que nasceram do proprio sistema."
              actionLabel="Exportar financeiro"
              onAction={() => exportCsv("financeiro", data.entries)}
            />

            <ReportCard
              title="Lancamentos recentes"
              rows={recentFinancialEntries}
              emptyText="Nenhum lancamento registrado."
              renderRow={(entry) => (
                <div style={rowStyle}>
                  <div>
                    <strong>{entry.description}</strong>
                    <span style={rowMetaStyle}>{entry.accountName} | {entry.category}</span>
                  </div>
                  <div>
                    <strong>{formatCurrency(entry.amount)}</strong>
                    <span style={rowMetaStyle}>
                      {formatEntryType(entry.entryType)} | {formatFinancialStatus(entry.status)}
                      {entry.itemCount ? ` | ${entry.itemCount} item(ns)` : ""}
                    </span>
                  </div>
                </div>
              )}
            />
          </section>
        </>
      )}
    </main>
  );
}

function SectionHeader({
  title,
  description,
  actionLabel,
  onAction,
}: Readonly<{ title: string; description: string; actionLabel: string; onAction: () => void }>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>{description}</p>
      </div>

      <button type="button" onClick={onAction} style={secondaryButtonStyle}>
        {actionLabel}
      </button>
    </div>
  );
}

function ReportCard<T>({
  title,
  rows,
  emptyText,
  renderRow,
}: Readonly<{
  title: string;
  rows: T[];
  emptyText: string;
  renderRow: (row: T) => React.ReactNode;
}>) {
  return (
    <article style={reportCardStyle}>
      <strong style={{ fontSize: 20 }}>{title}</strong>
      {rows.length === 0 ? (
        <div style={emptyMiniStateStyle}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>{rows.map((row, index) => <div key={index}>{renderRow(row)}</div>)}</div>
      )}
    </article>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 22,
        background: accent ? "rgba(43, 110, 82, 0.12)" : "rgba(255,255,255,0.74)",
        border: "1px solid rgba(232, 217, 202, 0.9)",
      }}
    >
      <p style={cardEyebrowStyle(accent)}>{label}</p>
      <h2 style={{ margin: "10px 0 0", fontSize: 34 }}>{value}</h2>
    </article>
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

const heroPanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  padding: 28,
  borderRadius: 28,
  background: "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
  border: "1px solid var(--border)",
  boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
} as const;

const sectionStyle = {
  display: "grid",
  gap: 18,
  padding: 24,
  borderRadius: 24,
  border: "1px solid var(--border)",
  background: "var(--surface)",
} as const;

const reportCardStyle = {
  display: "grid",
  gap: 14,
  padding: 20,
  borderRadius: 20,
  border: "1px solid rgba(232, 217, 202, 0.9)",
  background: "rgba(255,255,255,0.78)",
} as const;

const gridTwoColumnsStyle = {
  display: "grid",
  gap: 18,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
} as const;

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "12px 14px",
  borderRadius: 14,
  background: "rgba(245, 239, 231, 0.85)",
} as const;

const rowMetaStyle = {
  display: "block",
  marginTop: 6,
  color: "var(--muted)",
  lineHeight: 1.5,
} as const;

const emptyMiniStateStyle = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
  color: "var(--muted)",
  lineHeight: 1.6,
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

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
} as const;

function cardEyebrowStyle(accent?: boolean) {
  return {
    margin: 0,
    color: accent ? "#245844" : "var(--primary)",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: 12,
    fontWeight: 700,
  } as const;
}

const primaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
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
  cursor: "pointer",
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
