"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type DashboardSummary = {
  customersCount: number;
  draftQuotesCount: number;
  approvedQuotesCount: number;
  openOrdersCount: number;
  productionOrdersCount: number;
  lowStockProductsCount: number;
  pendingIncome: number;
  pendingExpense: number;
  projectedBalance: number;
};

type SummaryResponse = {
  success: boolean;
  message?: string;
  data?: DashboardSummary;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/dashboard/summary", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as SummaryResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o dashboard.");
          setSummary(null);
          return;
        }

        setSummary(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os indicadores principais.");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, []);

  const metrics = summary
    ? [
        {
          label: "Pedidos em aberto",
          value: String(summary.openOrdersCount),
          description: `${summary.productionOrdersCount} em producao agora.`,
          href: "/admin/pedidos",
        },
        {
          label: "Orcamentos pendentes",
          value: String(summary.draftQuotesCount),
          description: `${summary.approvedQuotesCount} aprovados aguardando proximo passo.`,
          href: "/admin/orcamentos",
        },
        {
          label: "Clientes ativos",
          value: String(summary.customersCount),
          description: "Base pronta para novos atendimentos.",
          href: "/admin/clientes",
        },
        {
          label: "Saldo projetado",
          value: formatCurrency(summary.projectedBalance),
          description: `Receber ${formatCurrency(summary.pendingIncome)} | pagar ${formatCurrency(summary.pendingExpense)}`,
          href: "/admin/financeiro",
        },
      ]
    : [];

  const attentionItems = useMemo(
    (): Array<{
      title: string;
      value: string;
      href: string;
      status: string;
      tone: "warning" | "success" | "info" | "neutral";
    }> =>
      summary
        ? [
            {
              title: "Itens abaixo do minimo",
              value: `${summary.lowStockProductsCount} registro(s)`,
              href: "/admin/estoque/posicao",
              status: summary.lowStockProductsCount > 0 ? "Atencao" : "Normal",
              tone: summary.lowStockProductsCount > 0 ? "warning" : "success",
            },
            {
              title: "Orcamentos aguardando acao",
              value: `${summary.draftQuotesCount} proposta(s) para revisar`,
              href: "/admin/orcamentos",
              status: summary.draftQuotesCount > 0 ? "Pendente" : "Em dia",
              tone: summary.draftQuotesCount > 0 ? "warning" : "success",
            },
            {
              title: "Pedidos em andamento",
              value: `${summary.openOrdersCount} pedido(s) ativos`,
              href: "/admin/pedidos",
              status: summary.openOrdersCount > 0 ? "Em andamento" : "Sem fila",
              tone: summary.openOrdersCount > 0 ? "info" : "neutral",
            },
            {
              title: "Despesas pendentes",
              value: formatCurrency(summary.pendingExpense),
              href: "/admin/financeiro?entryType=EXPENSE&status=PENDING",
              status: summary.pendingExpense > 0 ? "Acompanhar" : "Controlado",
              tone: summary.pendingExpense > 0 ? "warning" : "success",
            },
          ]
        : [],
    [summary],
  );

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Central de trabalho"
        description="Veja o que precisa de atencao e avance para a proxima acao sem navegar modulo por modulo."
        primaryAction={{ href: "/admin/vendas/novo", label: "Nova venda" }}
        secondaryActions={[
          { href: "/admin/orcamentos/novo", label: "Novo orcamento", variant: "secondary" },
          { href: "/admin/estoque/entradas/novo", label: "Nova entrada", variant: "secondary" },
          { href: "/admin/financeiro/lancamentos/novo", label: "Registrar despesa", variant: "secondary" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o dashboard.">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Carregando indicadores" description="Estamos consolidando os dados operacionais da empresa.">
          <Skeleton lines={8} />
        </SectionCard>
      ) : (
        <>
          <section className="admin-card-grid">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                description={metric.description}
                href={metric.href}
              />
            ))}
          </section>

          <div className="admin-layout-grid admin-layout-grid--sidebar">
            <SectionCard
              title="Precisa de atencao"
              description="Pendencias clicaveis para agir com menos passos."
            >
              <div className="admin-list-stack">
                {attentionItems.map((item) => (
                  <Link key={item.title} href={item.href} className="admin-list-card">
                    <div className="admin-list-card__header">
                      <div className="admin-list-card__heading">
                        <strong className="admin-list-card__title">{item.title}</strong>
                        <span className="admin-list-card__subtitle">{item.value}</span>
                      </div>
                      <StatusBadge status={item.status} tone={item.tone} />
                    </div>
                    <span className="admin-list-card__hint">
                      Abra a lista correspondente ja no contexto mais importante desta pendencia.
                    </span>
                  </Link>
                ))}
              </div>
            </SectionCard>

            <div className="admin-page-stack">
              <SectionCard
                title="Acoes rapidas"
                description="Atalhos reduzidos para o que mais acontece no dia a dia."
              >
                <div className="admin-list-stack">
                  <QuickAction href="/admin/vendas/novo" label="Nova venda" />
                  <QuickAction href="/admin/clientes/novo" label="Cadastrar cliente" />
                  <QuickAction href="/admin/orcamentos/novo" label="Novo orcamento" />
                  <QuickAction href="/admin/site/leads" label="Tratar leads do site" />
                </div>
              </SectionCard>

              <SectionCard
                title="Resumo do periodo"
                description="Leitura curta para orientar a proxima decisao."
              >
                <div className="admin-summary-list">
                  <SummaryLine
                    label="Recebimentos previstos"
                    value={formatCurrency(summary?.pendingIncome ?? 0)}
                  />
                  <SummaryLine
                    label="Despesas previstas"
                    value={formatCurrency(summary?.pendingExpense ?? 0)}
                  />
                  <SummaryLine
                    label="Pedidos em producao"
                    value={String(summary?.productionOrdersCount ?? 0)}
                  />
                  <SummaryLine
                    label="Reposicao necessaria"
                    value={String(summary?.lowStockProductsCount ?? 0)}
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function QuickAction({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link href={href} className="admin-button admin-button--secondary" style={{ justifyContent: "space-between" }}>
      <span>{label}</span>
      <span aria-hidden="true">{">"}</span>
    </Link>
  );
}

function SummaryLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-summary-row">
      <span style={{ color: "var(--muted)" }}>{label}</span>
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
