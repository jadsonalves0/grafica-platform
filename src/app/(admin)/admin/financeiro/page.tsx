"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type FinancialAccount = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  isActive: boolean;
};

type FinancialCategory = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
};

type FinancialEntry = {
  id: string;
  accountId: string;
  accountName: string;
  financialCategoryId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  inventoryEntryId?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  quoteId?: string | null;
  quoteCode?: string | null;
  entryType: "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "TRANSFER";
  originType: "MANUAL" | "ENTRY" | "PRODUCTION" | "ORDER" | "QUOTE" | "WEBSITE";
  originLabel: string;
  originHref?: string | null;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string | null;
  itemCount: number;
  installmentNumber?: number | null;
  installmentCount?: number | null;
};

type OrderFinancialBridge = {
  id: string;
  code: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  productionStatus:
    | "PENDING"
    | "IN_PRODUCTION"
    | "WAITING_APPROVAL"
    | "READY"
    | "DELIVERED";
  customerName: string;
  totalAmount: number;
  deliveryDate?: string | null;
  hasLinkedSale?: boolean;
  linkedSaleEntryId?: string | null;
  readyForSale?: boolean;
};

type CashFlowSummary = {
  pendingIncome: number;
  pendingExpense: number;
  paidIncome: number;
  paidExpense: number;
  overdueIncome: number;
  overdueExpense: number;
  projectedBalance: number;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type FinancialView = "overview" | "receivable" | "payable" | "cash" | "manual";

export default function FinanceiroPage() {
  const searchParams = useSearchParams();
  const view = resolveFinancialView(searchParams);
  const statusFilter = readStatusFilter(searchParams.get("status"));
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [orders, setOrders] = useState<OrderFinancialBridge[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const feedback = searchParams.get("feedback");

    if (feedback === "entry-created") {
      setSuccessMessage("Lancamento financeiro cadastrado com sucesso.");
    } else if (feedback === "entry-updated") {
      setSuccessMessage("Lancamento financeiro atualizado com sucesso.");
    } else {
      setSuccessMessage(null);
      return undefined;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFinancial() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [accountsResponse, categoriesResponse, entriesResponse, summaryResponse, ordersResponse] =
          await Promise.all([
            fetch("/api/financial/accounts", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/financial/categories", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/financial/entries", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/financial/summary", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/orders", { signal: controller.signal, cache: "no-store" }),
          ]);

        const accountsResult = (await accountsResponse.json()) as ApiResult<FinancialAccount[]>;
        const categoriesResult = (await categoriesResponse.json()) as ApiResult<FinancialCategory[]>;
        const entriesResult = (await entriesResponse.json()) as ApiResult<FinancialEntry[]>;
        const summaryResult = (await summaryResponse.json()) as ApiResult<CashFlowSummary>;
        const ordersResult = (await ordersResponse.json()) as ApiResult<OrderFinancialBridge[]>;

        if (!accountsResponse.ok || !accountsResult.success || !accountsResult.data) {
          setErrorMessage(accountsResult.message ?? "Nao foi possivel carregar as contas.");
          return;
        }

        if (!categoriesResponse.ok || !categoriesResult.success || !categoriesResult.data) {
          setErrorMessage(categoriesResult.message ?? "Nao foi possivel carregar as categorias.");
          return;
        }

        if (!entriesResponse.ok || !entriesResult.success || !entriesResult.data) {
          setErrorMessage(entriesResult.message ?? "Nao foi possivel carregar os lancamentos.");
          return;
        }

        if (!summaryResponse.ok || !summaryResult.success || !summaryResult.data) {
          setErrorMessage(summaryResult.message ?? "Nao foi possivel carregar o resumo financeiro.");
          return;
        }

        if (!ordersResponse.ok || !ordersResult.success || !ordersResult.data) {
          setErrorMessage(ordersResult.message ?? "Nao foi possivel carregar os pedidos para faturamento.");
          return;
        }

        setAccounts(accountsResult.data);
        setCategories(categoriesResult.data);
        setEntries(entriesResult.data);
        setSummary(summaryResult.data);
        setOrders(ordersResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o financeiro.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFinancial();

    return () => controller.abort();
  }, []);

  const receivableEntries = useMemo(
    () => entries.filter((entry) => isReceivable(entry) && matchesStatus(entry, statusFilter)),
    [entries, statusFilter],
  );
  const payableEntries = useMemo(
    () => entries.filter((entry) => isPayable(entry) && matchesStatus(entry, statusFilter)),
    [entries, statusFilter],
  );
  const manualEntries = useMemo(
    () => entries.filter((entry) => isManualEntry(entry) && matchesStatus(entry, statusFilter)),
    [entries, statusFilter],
  );
  const cashEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.status !== "CANCELED" &&
          (entry.status === "PAID" || entry.entryType === "TRANSFER"),
      ),
    [entries],
  );
  const recentEntries = useMemo(() => entries.slice(0, 8), [entries]);
  const pendingOrdersForBilling = useMemo(
    () =>
      orders.filter(
        (order) => order.readyForSale && !order.hasLinkedSale && order.status !== "CANCELED",
      ),
    [orders],
  );

  const categoryStats = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "INCOME" && category.isActive).length,
      expense: categories.filter((category) => category.type === "EXPENSE" && category.isActive).length,
    }),
    [categories],
  );

  const header = getHeaderConfig(view);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title={header.title}
        description={header.description}
        primaryAction={header.primaryAction}
        secondaryActions={header.secondaryActions}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o financeiro.">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {isLoading ? (
        <SectionCard title="Carregando financeiro">
          <Skeleton lines={8} />
        </SectionCard>
      ) : (
        <>
          {view === "overview" ? (
            <>
              <section className="admin-panel-grid">
                <MetricCard label="A receber" value={formatCurrency(summary?.pendingIncome ?? 0)} description="Titulos em aberto." href="/admin/financeiro?view=receivable&status=PENDING" />
                <MetricCard label="A pagar" value={formatCurrency(summary?.pendingExpense ?? 0)} description="Compromissos pendentes." href="/admin/financeiro?view=payable&status=PENDING" />
                <MetricCard label="Recebido" value={formatCurrency(summary?.paidIncome ?? 0)} description="Receitas ja baixadas." />
                <MetricCard label="Saldo projetado" value={formatCurrency(summary?.projectedBalance ?? 0)} description="Fluxo esperado atual." href="/admin/financeiro?view=cash" />
              </section>

              {pendingOrdersForBilling.length ? (
                <SectionCard
                  title="Pedidos prontos para faturamento"
                  description="Pedidos atendidos ou prontos nao viram receita sozinhos. Gere a venda para refletir no financeiro."
                >
                  <OrderBillingList orders={pendingOrdersForBilling} />
                </SectionCard>
              ) : null}

              <section className="admin-card-grid">
                <SectionCard
                  title="A receber"
                  actions={<Link href="/admin/financeiro?view=receivable&status=PENDING" className="admin-link-button">Ver tudo</Link>}
                >
                  {receivableEntries.length === 0 ? (
                    <EmptyState
                      title="Nenhuma conta a receber"
                      description="As receitas pendentes aparecerao aqui para acompanhamento rapido."
                    />
                  ) : (
                    <EntryList entries={receivableEntries.slice(0, 6)} />
                  )}
                </SectionCard>

                <SectionCard
                  title="A pagar"
                  actions={<Link href="/admin/financeiro?view=payable&status=PENDING" className="admin-link-button">Ver tudo</Link>}
                >
                  {payableEntries.length === 0 ? (
                    <EmptyState
                      title="Nenhuma conta a pagar"
                      description="As despesas pendentes aparecerao aqui quando houver compromissos em aberto."
                    />
                  ) : (
                    <EntryList entries={payableEntries.slice(0, 6)} />
                  )}
                </SectionCard>

                <SectionCard
                  title="Caixa e bancos"
                  actions={<Link href="/admin/financeiro?view=cash" className="admin-link-button">Abrir caixa e bancos</Link>}
                >
                  <div className="admin-list-stack">
                    {accounts.slice(0, 5).map((account) => (
                      <div key={account.id} className="admin-list-card">
                        <div className="admin-list-card__header">
                          <div className="admin-list-card__heading">
                            <strong className="admin-list-card__title">{account.name}</strong>
                            <span className="admin-list-card__subtitle">{formatAccountType(account.type)}</span>
                          </div>
                          <strong>{formatCurrency(account.initialBalance)}</strong>
                        </div>
                      </div>
                    ))}
                    <div className="admin-list-card__meta">
                      <MiniStat label="Categorias de receita" value={String(categoryStats.income)} />
                      <MiniStat label="Categorias de despesa" value={String(categoryStats.expense)} />
                    </div>
                  </div>
                </SectionCard>
              </section>

              <SectionCard title="Lancamentos recentes">
                {recentEntries.length === 0 ? (
                  <EmptyState
                    title="Nenhum lancamento encontrado"
                    description="Os reflexos de vendas, entradas e os poucos lancamentos manuais aparecerao aqui conforme forem registrados."
                    action={{ href: "/admin/financeiro/lancamentos/novo", label: "Criar lancamento manual" }}
                  />
                ) : (
                  <EntryList entries={recentEntries} />
                )}
              </SectionCard>
            </>
          ) : null}

          {view === "receivable" ? (
            <>
              <section className="admin-panel-grid">
                <MetricCard label="Vencidas" value={formatCurrency(sumAmounts(receivableEntries.filter((entry) => entry.status === "OVERDUE")))} description="Precisam de acao imediata." />
                <MetricCard label="Pendentes" value={formatCurrency(sumAmounts(receivableEntries.filter((entry) => entry.status === "PENDING")))} description="Ainda em aberto." />
                <MetricCard label="Recebidas" value={formatCurrency(sumAmounts(receivableEntries.filter((entry) => entry.status === "PAID")))} description="Ja baixadas." />
                <MetricCard label="Titulos" value={String(receivableEntries.length)} description="Registros nesta visao." />
              </section>

              <SectionCard title="Contas a receber">
                {receivableEntries.length === 0 ? (
                  <EmptyState
                    title="Nenhuma conta a receber encontrada"
                    description="Ajuste o filtro ou volte para a visao geral do financeiro."
                    action={{ href: "/admin/financeiro", label: "Voltar para visao geral" }}
                  />
                ) : (
                  <EntryList entries={receivableEntries} />
                )}
              </SectionCard>
            </>
          ) : null}

          {view === "payable" ? (
            <>
              <section className="admin-panel-grid">
                <MetricCard label="Vencidas" value={formatCurrency(sumAmounts(payableEntries.filter((entry) => entry.status === "OVERDUE")))} description="Compromissos atrasados." />
                <MetricCard label="Pendentes" value={formatCurrency(sumAmounts(payableEntries.filter((entry) => entry.status === "PENDING")))} description="A pagar." />
                <MetricCard label="Pagas" value={formatCurrency(sumAmounts(payableEntries.filter((entry) => entry.status === "PAID")))} description="Ja liquidadas." />
                <MetricCard label="Titulos" value={String(payableEntries.length)} description="Registros nesta visao." />
              </section>

              <SectionCard title="Contas a pagar">
                {payableEntries.length === 0 ? (
                  <EmptyState
                    title="Nenhuma conta a pagar encontrada"
                    description="Ajuste o filtro ou volte para a visao geral do financeiro."
                    action={{ href: "/admin/financeiro", label: "Voltar para visao geral" }}
                  />
                ) : (
                  <EntryList entries={payableEntries} />
                )}
              </SectionCard>
            </>
          ) : null}

          {view === "cash" ? (
            <>
              <section className="admin-panel-grid">
                <MetricCard label="Saldo projetado" value={formatCurrency(summary?.projectedBalance ?? 0)} description="Baseado em contas e lancamentos." />
                <MetricCard label="Recebido" value={formatCurrency(summary?.paidIncome ?? 0)} description="Entradas baixadas." />
                <MetricCard label="Pago" value={formatCurrency(summary?.paidExpense ?? 0)} description="Saidas baixadas." />
                <MetricCard label="Contas" value={String(accounts.length)} description="Caixas, bancos e carteiras." />
              </section>

              <section className="admin-card-grid">
                <SectionCard
                  title="Contas financeiras"
                  actions={<Link href="/admin/financeiro/contas/nova" className="admin-link-button">Nova conta</Link>}
                >
                  <div className="admin-list-stack">
                    {accounts.length === 0 ? (
                      <EmptyState
                        title="Nenhuma conta cadastrada"
                        description="Cadastre um caixa, banco ou carteira digital para usar no financeiro."
                        action={{ href: "/admin/financeiro/contas/nova", label: "Cadastrar conta" }}
                      />
                    ) : (
                      accounts.map((account) => (
                        <div key={account.id} className="admin-list-card">
                          <div className="admin-list-card__header">
                            <div className="admin-list-card__heading">
                              <strong className="admin-list-card__title">{account.name}</strong>
                              <span className="admin-list-card__subtitle">{formatAccountType(account.type)}</span>
                            </div>
                            <strong>{formatCurrency(account.initialBalance)}</strong>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Movimentacoes recentes">
                  {cashEntries.length === 0 ? (
                    <EmptyState
                      title="Nenhuma movimentacao recente"
                      description="Recebimentos, pagamentos e transferencias aparecerao aqui."
                    />
                  ) : (
                    <EntryList entries={cashEntries.slice(0, 10)} />
                  )}
                </SectionCard>
              </section>
            </>
          ) : null}

          {view === "manual" ? (
            <>
              <section className="admin-panel-grid">
                <MetricCard label="Pendentes" value={formatCurrency(sumAmounts(manualEntries.filter((entry) => entry.status === "PENDING")))} description="Lancamentos manuais em aberto." />
                <MetricCard label="Pagos" value={formatCurrency(sumAmounts(manualEntries.filter((entry) => entry.status === "PAID")))} description="Lancamentos manuais baixados." />
                <MetricCard label="Vencidos" value={formatCurrency(sumAmounts(manualEntries.filter((entry) => entry.status === "OVERDUE")))} description="Lancamentos que exigem revisao." />
                <MetricCard label="Registros" value={String(manualEntries.length)} description="Itens nesta visao." />
              </section>

              <SectionCard title="Lancamentos manuais">
                {manualEntries.length === 0 ? (
                  <EmptyState
                    title="Nenhum lancamento manual encontrado"
                    description="Vendas e entradas seguem seus fluxos proprios. Use esta area apenas para excecoes manuais."
                    action={{ href: "/admin/financeiro/lancamentos/novo", label: "Novo lancamento manual" }}
                  />
                ) : (
                  <EntryList entries={manualEntries} />
                )}
              </SectionCard>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}

function OrderBillingList({ orders }: Readonly<{ orders: OrderFinancialBridge[] }>) {
  return (
    <div className="admin-list-stack">
      {orders.map((order) => (
        <article key={order.id} className="admin-list-card">
          <div className="admin-list-card__header">
            <div className="admin-list-card__heading">
              <strong className="admin-list-card__title">{order.code}</strong>
              <span className="admin-list-card__subtitle">{order.customerName}</span>
            </div>
            <div className="admin-row">
              <StatusBadge status={formatCommercialStatus(order.status)} tone={mapCommercialTone(order.status)} />
              <StatusBadge status={formatProductionStatus(order.productionStatus)} tone={mapProductionTone(order.productionStatus)} />
            </div>
          </div>

          <div className="admin-list-card__meta">
            <MiniStat label="Entrega" value={order.deliveryDate ? formatDate(order.deliveryDate) : "Sem prazo"} />
            <MiniStat label="Total" value={formatCurrency(order.totalAmount)} />
            <MiniStat label="Proxima acao" value="Gerar venda" />
          </div>

          <div className="admin-list-card__footer">
            <span className="admin-list-card__hint">
              Este pedido ja esta operacionalmente pronto, mas ainda nao entrou no financeiro.
            </span>
            <div className="admin-row">
              <Link href={`/admin/pedidos/${order.id}`} className="admin-button admin-button--secondary">
                Abrir pedido
              </Link>
              <Link href={`/admin/vendas/novo?orderId=${order.id}`} className="admin-button admin-button--primary">
                Gerar venda
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function EntryList({ entries }: Readonly<{ entries: FinancialEntry[] }>) {
  return (
    <div className="admin-list-stack">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={`/admin/financeiro/lancamentos/${entry.id}`}
          className="admin-list-card"
        >
          <div className="admin-list-card__header">
            <div className="admin-list-card__heading">
              <strong className="admin-list-card__title">{entry.description}</strong>
              <span className="admin-list-card__subtitle">
                {entry.accountName} | {entry.category}
              </span>
            </div>
            <StatusBadge status={formatFinancialStatus(entry.status)} tone={mapFinancialTone(entry.status)} />
          </div>

          <div className="admin-list-card__meta">
            <MiniStat label="Natureza" value={formatEntryType(entry.entryType)} />
            <MiniStat label="Vencimento" value={formatDate(entry.dueDate)} />
            <MiniStat label="Valor" value={formatCurrency(entry.amount)} />
            <MiniStat label="Origem" value={entry.originLabel} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function resolveFinancialView(searchParams: URLSearchParams): FinancialView {
  const explicitView = searchParams.get("view");
  if (
    explicitView === "overview" ||
    explicitView === "receivable" ||
    explicitView === "payable" ||
    explicitView === "cash" ||
    explicitView === "manual"
  ) {
    return explicitView;
  }

  const bucket = searchParams.get("bucket");
  const entryType = searchParams.get("entryType");
  if (bucket === "receivable" || entryType === "INCOME" || entryType === "RECEIVABLE") {
    return "receivable";
  }
  if (bucket === "payable" || entryType === "EXPENSE" || entryType === "PAYABLE") {
    return "payable";
  }

  return "overview";
}

function readStatusFilter(value: string | null) {
  return value === "PENDING" || value === "PAID" || value === "OVERDUE" || value === "CANCELED"
    ? value
    : "all";
}

function matchesStatus(entry: FinancialEntry, statusFilter: ReturnType<typeof readStatusFilter>) {
  return statusFilter === "all" ? true : entry.status === statusFilter;
}

function isReceivable(entry: FinancialEntry) {
  return entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE";
}

function isPayable(entry: FinancialEntry) {
  return entry.entryType === "EXPENSE" || entry.entryType === "PAYABLE";
}

function isManualEntry(entry: FinancialEntry) {
  return (
    !entry.inventoryEntryId &&
    !entry.orderId &&
    !entry.quoteId &&
    entry.originType === "MANUAL" &&
    entry.itemCount === 0
  );
}

function sumAmounts(entries: FinancialEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getHeaderConfig(view: FinancialView) {
  if (view === "receivable") {
    return {
      title: "Contas a receber",
      description: "Veja apenas receitas, parcelas e recebimentos que realmente pertencem ao contas a receber.",
      primaryAction: undefined,
      secondaryActions: [
        { href: "/admin/financeiro", label: "Voltar para visao geral", variant: "secondary" as const },
      ],
    };
  }

  if (view === "payable") {
    return {
      title: "Contas a pagar",
      description: "Veja apenas compromissos, vencimentos e baixas relacionados ao contas a pagar.",
      primaryAction: undefined,
      secondaryActions: [
        { href: "/admin/financeiro", label: "Voltar para visao geral", variant: "secondary" as const },
      ],
    };
  }

  if (view === "cash") {
    return {
      title: "Caixa e bancos",
      description: "Acompanhe contas financeiras, saldo projetado e movimentacoes recentes sem misturar com titulos a receber ou a pagar.",
      primaryAction: { href: "/admin/financeiro/contas/nova", label: "Nova conta financeira" },
      secondaryActions: [
        { href: "/admin/financeiro", label: "Voltar para visao geral", variant: "secondary" as const },
      ],
    };
  }

  if (view === "manual") {
    return {
      title: "Lancamentos manuais",
      description: "Use esta area apenas para excecoes. Vendas e entradas continuam sendo os fluxos oficiais para gerar reflexos financeiros.",
      primaryAction: { href: "/admin/financeiro/lancamentos/novo", label: "Novo lancamento manual" },
      secondaryActions: [
        { href: "/admin/financeiro", label: "Voltar para visao geral", variant: "secondary" as const },
      ],
    };
  }

  return {
    title: "Visao financeira",
    description: "Acompanhe o que entra, o que sai e o saldo das contas. Pedidos prontos aparecem como pendencia de faturamento, e o financeiro so considera fatos ja vendidos ou registrados.",
    primaryAction: { href: "/admin/financeiro/lancamentos/novo", label: "Novo lancamento manual" },
    secondaryActions: [
      { href: "/admin/financeiro/categorias", label: "Categorias financeiras", variant: "secondary" as const },
      { href: "/admin/financeiro?view=cash", label: "Caixa e bancos", variant: "secondary" as const },
    ],
  };
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

function formatAccountType(type: string) {
  if (type === "CASH") return "Caixa";
  if (type === "BANK") return "Banco";
  return "Conta";
}

function formatEntryType(type: FinancialEntry["entryType"]) {
  if (type === "RECEIVABLE") return "Conta a receber";
  if (type === "PAYABLE") return "Conta a pagar";
  if (type === "TRANSFER") return "Transferencia";
  return type === "INCOME" ? "Receita" : "Despesa";
}

function formatFinancialStatus(status: FinancialEntry["status"]) {
  if (status === "PAID") return "Pago";
  if (status === "OVERDUE") return "Vencido";
  if (status === "CANCELED") return "Cancelado";
  return "Pendente";
}

function mapFinancialTone(status: FinancialEntry["status"]) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "danger" as const;
  if (status === "CANCELED") return "neutral" as const;
  return "warning" as const;
}

function formatCommercialStatus(status: OrderFinancialBridge["status"]) {
  if (status === "IN_PROGRESS") return "Em andamento";
  if (status === "COMPLETED") return "Concluido";
  if (status === "CANCELED") return "Cancelado";
  return "Aberto";
}

function mapCommercialTone(status: OrderFinancialBridge["status"]) {
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELED") return "danger" as const;
  return "warning" as const;
}

function formatProductionStatus(status: OrderFinancialBridge["productionStatus"]) {
  if (status === "IN_PRODUCTION") return "Em producao";
  if (status === "WAITING_APPROVAL") return "Aguardando aprovacao";
  if (status === "READY") return "Pronto";
  if (status === "DELIVERED") return "Entregue";
  return "Pendente";
}

function mapProductionTone(status: OrderFinancialBridge["productionStatus"]) {
  if (status === "IN_PRODUCTION") return "info" as const;
  if (status === "READY" || status === "DELIVERED") return "success" as const;
  return "warning" as const;
}
