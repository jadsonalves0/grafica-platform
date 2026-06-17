"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  entryType: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string | null;
  itemCount: number;
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
          setErrorMessage(summaryResult.message ?? "Nao foi possivel carregar o resumo do caixa.");
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

    loadFinancial();

    return () => controller.abort();
  }, []);

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === "INCOME" && category.isActive).length,
    [categories],
  );

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "EXPENSE" && category.isActive).length,
    [categories],
  );

  const itemizedSales = useMemo(
    () => entries.filter((entry) => entry.entryType === "INCOME" && entry.itemCount > 0),
    [entries],
  );

  const expenseEntries = useMemo(
    () => entries.filter((entry) => entry.entryType === "EXPENSE").slice(0, 6),
    [entries],
  );

  const recentEntries = useMemo(() => entries.slice(0, 8), [entries]);

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section style={heroPanelStyle}>
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
            <p style={eyebrowStyle}>Caixa, receita e despesa</p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Financeiro
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Gerencie contas, categorias oficiais, receitas, despesas e vendas avulsas em uma unica visao.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/financeiro/contas/nova" style={primaryButtonStyle}>
              Nova conta
            </Link>
            <Link href="/admin/financeiro/lancamentos/novo" style={secondaryButtonStyle}>
              Novo lancamento
            </Link>
            <Link href="/admin/financeiro/categorias" style={secondaryButtonStyle}>
              Categorias
            </Link>
            <Link href="/admin/relatorios" style={secondaryButtonStyle}>
              Relatorios
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          <SummaryCard label="Receita pendente" value={formatCurrency(summary?.pendingIncome ?? 0)} />
          <SummaryCard label="Despesa pendente" value={formatCurrency(summary?.pendingExpense ?? 0)} />
          <SummaryCard label="Receita vencida" value={formatCurrency(summary?.overdueIncome ?? 0)} />
          <SummaryCard label="Despesa vencida" value={formatCurrency(summary?.overdueExpense ?? 0)} />
          <SummaryCard label="Saldo projetado" value={formatCurrency(summary?.projectedBalance ?? 0)} accent />
        </div>
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      {isLoading ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando financeiro...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos consolidando contas, categorias e lancamentos.</span>
        </section>
      ) : (
        <>
          <section style={sectionStyle}>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              }}
            >
              <KpiCard label="Contas ativas" value={String(accounts.filter((account) => account.isActive).length)} />
              <KpiCard label="Categorias de receita" value={String(incomeCategories)} />
              <KpiCard label="Categorias de despesa" value={String(expenseCategories)} />
              <KpiCard label="Vendas avulsas com itens" value={String(itemizedSales.length)} accent />
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.9fr)",
              alignItems: "start",
            }}
          >
            <section style={sectionStyle}>
              <SectionHeader
                title="Lancamentos recentes"
                description="Titulos financeiros, receitas e despesas registradas no sistema."
              />

              <div style={{ display: "grid", gap: 12 }}>
                {recentEntries.length === 0 ? (
                  <EmptyState text="Nenhum lancamento registrado ainda." />
                ) : (
                  recentEntries.map((entry) => (
                    <article key={entry.id} style={listCardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong style={{ display: "block", marginBottom: 6 }}>{entry.description}</strong>
                          <span style={{ color: "var(--muted)" }}>
                            {entry.accountName} | {entry.category}
                          </span>
                        </div>
                        <div style={statusBadgeStyle(entry.status)}>
                          {formatFinancialStatus(entry.status)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 12,
                        }}
                      >
                        <MiniMetric label="Natureza" value={formatEntryType(entry.entryType)} />
                        <MiniMetric label="Vencimento" value={formatDate(entry.dueDate)} />
                        <MiniMetric label="Valor" value={formatCurrency(entry.amount)} />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                          paddingTop: 8,
                          borderTop: "1px solid rgba(232, 217, 202, 0.85)",
                        }}
                      >
                        <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                          {entry.itemCount > 0
                            ? `${entry.itemCount} item(ns) associados a esta venda avulsa.`
                            : "Lancamento simples sem itens vinculados."}
                        </span>
                        <Link href={`/admin/financeiro/lancamentos/${entry.id}`} style={miniActionStyle}>
                          Editar lancamento
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <div style={{ display: "grid", gap: 24 }}>
              <section style={sectionStyle}>
                <SectionHeader
                  title="Contas financeiras"
                  description="Bancos, caixas e carteiras digitais usados pela operacao."
                />

                <div style={{ display: "grid", gap: 12 }}>
                  {accounts.length === 0 ? (
                    <EmptyState text="Nenhuma conta financeira cadastrada." />
                  ) : (
                    accounts.map((account) => (
                      <article key={account.id} style={listCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <strong style={{ display: "block", marginBottom: 6 }}>{account.name}</strong>
                            <span style={{ color: "var(--muted)" }}>{formatAccountType(account.type)}</span>
                          </div>
                          <strong>{formatCurrency(account.initialBalance)}</strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                            paddingTop: 8,
                            borderTop: "1px solid rgba(232, 217, 202, 0.85)",
                          }}
                        >
                          <span style={{ color: "var(--muted)", fontSize: 13 }}>
                            {account.isActive ? "Conta ativa para operacao." : "Conta inativa."}
                          </span>
                          <Link href={`/admin/financeiro/contas/${account.id}`} style={miniActionStyle}>
                            Editar conta
                          </Link>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section style={sectionStyle}>
                <SectionHeader
                  title="Vendas avulsas"
                  description="Receitas com itens vinculados para rastrear o que foi vendido no caixa."
                />

                <div style={{ display: "grid", gap: 12 }}>
                  {itemizedSales.length === 0 ? (
                    <EmptyState text="Nenhuma venda avulsa com itens foi registrada ainda." />
                  ) : (
                    itemizedSales.slice(0, 5).map((entry) => (
                      <article key={entry.id} style={listCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>{entry.description}</strong>
                          <strong>{formatCurrency(entry.amount)}</strong>
                        </div>
                        <span style={{ color: "var(--muted)" }}>
                          {entry.itemCount} item(ns) | {entry.category} | {formatFinancialStatus(entry.status)}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section style={sectionStyle}>
                <SectionHeader
                  title="Despesas recentes"
                  description="Despesas avulsas e compromissos financeiros em aberto."
                />

                <div style={{ display: "grid", gap: 12 }}>
                  {expenseEntries.length === 0 ? (
                    <EmptyState text="Nenhuma despesa registrada ainda." />
                  ) : (
                    expenseEntries.map((entry) => (
                      <article key={entry.id} style={listCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>{entry.description}</strong>
                          <strong>{formatCurrency(entry.amount)}</strong>
                        </div>
                        <span style={{ color: "var(--muted)" }}>
                          {entry.category} | {formatFinancialStatus(entry.status)} | vence em {formatDate(entry.dueDate)}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function SectionHeader({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>{description}</p>
    </div>
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
        background: accent ? "rgba(43, 110, 82, 0.12)" : "rgba(255,255,255,0.72)",
        border: "1px solid rgba(232, 217, 202, 0.9)",
      }}
    >
      <p style={cardEyebrowStyle(accent)}>{label}</p>
      <h2 style={{ margin: "10px 0 0", fontSize: 34 }}>{value}</h2>
    </article>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 20,
        border: "1px solid rgba(232, 217, 202, 0.9)",
        background: accent ? "rgba(181, 66, 31, 0.1)" : "rgba(255,255,255,0.76)",
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "var(--muted)" }}>{label}</span>
      <strong style={{ fontSize: 30 }}>{value}</strong>
    </article>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        background: "rgba(245, 239, 231, 0.85)",
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 13 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed var(--border)",
        background: "rgba(255,255,255,0.55)",
        color: "var(--muted)",
      }}
    >
      {text}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatAccountType(type: string) {
  const labels: Record<string, string> = {
    CASH: "Caixa",
    BANK: "Banco",
    DIGITAL_WALLET: "Carteira digital",
  };
  return labels[type] ?? type;
}

function formatEntryType(type: string) {
  return type === "INCOME" ? "Receita" : "Despesa";
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

function statusBadgeStyle(status: string) {
  const colorMap: Record<string, { background: string; color: string }> = {
    PAID: { background: "rgba(43, 110, 82, 0.12)", color: "#245844" },
    PENDING: { background: "rgba(191, 132, 25, 0.12)", color: "#8d5a0a" },
    OVERDUE: { background: "rgba(167, 45, 45, 0.12)", color: "#8b2323" },
    CANCELED: { background: "rgba(117, 117, 117, 0.18)", color: "#444" },
  };
  const palette = colorMap[status] ?? colorMap.PENDING;
  return {
    padding: "10px 12px",
    borderRadius: 999,
    background: palette.background,
    color: palette.color,
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
  };
}

const heroPanelStyle = {
  display: "grid",
  gap: 18,
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

const listCardStyle = {
  display: "grid",
  gap: 12,
  padding: 18,
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.78)",
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
} as const;

const miniActionStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
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
