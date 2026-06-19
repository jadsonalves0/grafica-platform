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
  quoteId?: string | null;
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

export default function FinanceiroPage() {
  const searchParams = useSearchParams();
  const requestedEntryType = searchParams.get("entryType");
  const requestedBucket = searchParams.get("bucket");
  const requestedStatus = searchParams.get("status");
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
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
        const [accountsResponse, categoriesResponse, entriesResponse, summaryResponse] = await Promise.all([
          fetch("/api/financial/accounts", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/financial/categories", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/financial/entries", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/financial/summary", { signal: controller.signal, cache: "no-store" }),
        ]);

        const accountsResult = (await accountsResponse.json()) as ApiResult<FinancialAccount[]>;
        const categoriesResult = (await categoriesResponse.json()) as ApiResult<FinancialCategory[]>;
        const entriesResult = (await entriesResponse.json()) as ApiResult<FinancialEntry[]>;
        const summaryResult = (await summaryResponse.json()) as ApiResult<CashFlowSummary>;

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

        setAccounts(accountsResult.data);
        setCategories(categoriesResult.data);
        setEntries(entriesResult.data);
        setSummary(summaryResult.data);
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

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesType =
        requestedBucket === "receivable"
          ? entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE"
          : requestedBucket === "payable"
            ? entry.entryType === "EXPENSE" || entry.entryType === "PAYABLE"
            : requestedEntryType === "INCOME" ||
                requestedEntryType === "RECEIVABLE" ||
                requestedEntryType === "EXPENSE" ||
                requestedEntryType === "PAYABLE"
          ? entry.entryType === requestedEntryType
          : true;
      const matchesStatus =
        requestedStatus === "PENDING" ||
        requestedStatus === "PAID" ||
        requestedStatus === "OVERDUE" ||
        requestedStatus === "CANCELED"
          ? entry.status === requestedStatus
          : true;

      return matchesType && matchesStatus;
    });
  }, [entries, requestedBucket, requestedEntryType, requestedStatus]);

  const receivableEntries = useMemo(
    () =>
      filteredEntries
        .filter((entry) => entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE")
        .slice(0, 6),
    [filteredEntries],
  );
  const payableEntries = useMemo(
    () =>
      filteredEntries
        .filter((entry) => entry.entryType === "EXPENSE" || entry.entryType === "PAYABLE")
        .slice(0, 6),
    [filteredEntries],
  );
  const recentEntries = useMemo(() => filteredEntries.slice(0, 6), [filteredEntries]);

  const categoryStats = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "INCOME" && category.isActive).length,
      expense: categories.filter((category) => category.type === "EXPENSE" && category.isActive).length,
    }),
    [categories],
  );

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Visao financeira"
        description="Acompanhe o que entra, o que sai e o saldo das contas. Vendas e entradas geram seus reflexos aqui, enquanto o lancamento manual fica como excecao."
        primaryAction={{ href: "/admin/financeiro/lancamentos/novo?type=INCOME", label: "Registrar receita" }}
        secondaryActions={[
          { href: "/admin/financeiro/lancamentos/novo?type=EXPENSE", label: "Registrar despesa", variant: "secondary" },
          { href: "/admin/financeiro/categorias", label: "Categorias", variant: "secondary" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o financeiro.">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {isLoading ? (
        <SectionCard title="Carregando financeiro">
          <Skeleton lines={7} />
        </SectionCard>
      ) : (
        <>
          <section className="admin-panel-grid">
            <MetricCard label="A receber" value={formatCurrency(summary?.pendingIncome ?? 0)} description="Titulos em aberto." href="/admin/financeiro?bucket=receivable&status=PENDING" />
            <MetricCard label="A pagar" value={formatCurrency(summary?.pendingExpense ?? 0)} description="Compromissos pendentes." href="/admin/financeiro?bucket=payable&status=PENDING" />
            <MetricCard label="Recebido" value={formatCurrency(summary?.paidIncome ?? 0)} description="Receitas ja baixadas." />
            <MetricCard label="Saldo projetado" value={formatCurrency(summary?.projectedBalance ?? 0)} description="Fluxo esperado atual." />
          </section>

          <section className="admin-card-grid">
            <SectionCard
              title="A receber"
              actions={
                <Link href="/admin/financeiro?bucket=receivable&status=PENDING" className="admin-link-button">
                  Ver tudo
                </Link>
              }
            >
              {receivableEntries.length === 0 ? (
                <EmptyState
                  title="Nenhuma receita encontrada"
                  description="As receitas pendentes aparecerao aqui para acompanhamento rapido."
                />
              ) : (
                <EntryList entries={receivableEntries} />
              )}
            </SectionCard>

            <SectionCard
              title="A pagar"
              actions={
                <Link href="/admin/financeiro?bucket=payable&status=PENDING" className="admin-link-button">
                  Ver tudo
                </Link>
              }
            >
              {payableEntries.length === 0 ? (
                <EmptyState
                  title="Nenhuma despesa encontrada"
                  description="As despesas pendentes aparecerao aqui quando houver compromissos em aberto."
                />
              ) : (
                <EntryList entries={payableEntries} />
              )}
            </SectionCard>

            <SectionCard
              title="Caixa e bancos"
              actions={
                <Link href="/admin/financeiro/contas/nova" className="admin-link-button">
                  Nova conta
                </Link>
              }
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
      )}
    </main>
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
