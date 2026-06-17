"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

        setErrorMessage("Falha ao consultar os indicadores.");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();

    return () => controller.abort();
  }, []);

  const cards = summary
    ? [
        {
          title: "Clientes",
          value: String(summary.customersCount),
          description: "Base pronta para atendimento, proposta e acompanhamento.",
          href: "/admin/clientes",
        },
        {
          title: "Orcamentos",
          value: `${summary.draftQuotesCount} rascunhos / ${summary.approvedQuotesCount} aprovados`,
          description: "Panorama atual do fluxo comercial da grafica.",
          href: "/admin/orcamentos",
        },
        {
          title: "Pedidos",
          value: `${summary.openOrdersCount} abertos / ${summary.productionOrdersCount} em producao`,
          description: "Acompanhamento do que esta em andamento no operacional.",
          href: "/admin/pedidos",
        },
        {
          title: "Fluxo de caixa",
          value: formatCurrency(summary.projectedBalance),
          description: `Entradas pendentes ${formatCurrency(summary.pendingIncome)} e saidas pendentes ${formatCurrency(summary.pendingExpense)}.`,
          href: "/admin/financeiro",
        },
      ]
    : [];

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          padding: 28,
          borderRadius: 28,
          background:
            "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "var(--primary)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Painel gerencial
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 52 }}>
            Dashboard
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18, maxWidth: 900 }}>
            Visao executiva da operacao para acompanhar base de clientes, fluxo
            comercial, pedidos, estoque e caixa sem navegar modulo por modulo.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <QuickLink href="/admin/clientes" label="Clientes" />
          <QuickLink href="/admin/orcamentos" label="Orcamentos" />
          <QuickLink href="/admin/pedidos" label="Pedidos" />
          <QuickLink href="/admin/financeiro" label="Financeiro" />
        </div>
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {isLoading ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando indicadores...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos consolidando os dados da empresa.</span>
        </section>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
            }}
          >
            {cards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                style={{
                  display: "grid",
                  gap: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 24,
                  background: "var(--surface)",
                  padding: 22,
                  boxShadow: "0 14px 36px rgba(77, 39, 22, 0.05)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "var(--primary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {card.title}
                </p>
                <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>{card.value}</h2>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{card.description}</p>
              </Link>
            ))}
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 16,
            }}
          >
            <article
              style={{
                border: "1px solid var(--border)",
                borderRadius: 24,
                background: "var(--surface)",
                padding: 24,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Leitura executiva</h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
                {summary
                  ? `Hoje a base conta com ${summary.customersCount} clientes. Existem ${summary.openOrdersCount} pedidos abertos, ${summary.productionOrdersCount} em producao e ${summary.lowStockProductsCount} itens com estoque baixo.`
                  : "Sem dados para leitura executiva."}
              </p>
              <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>
                O saldo projetado atual considera entradas e saidas pendentes, ajudando a
                antecipar pressao de caixa antes de virar problema operacional.
              </p>
            </article>

            <article
              style={{
                border: "1px solid var(--border)",
                borderRadius: 24,
                background: "linear-gradient(180deg, rgba(181,66,31,0.08), rgba(255,255,255,0.9))",
                padding: 24,
                display: "grid",
                gap: 12,
                alignContent: "start",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Acoes rapidas</h2>
              <QuickAction href="/admin/clientes/novo" label="Cadastrar cliente" />
              <QuickAction href="/admin/orcamentos/novo" label="Criar orcamento" />
              <QuickAction href="/admin/estoque" label="Conferir estoque" />
              <QuickAction href="/admin/site/leads" label="Tratar leads do site" />
            </article>
          </section>
        </>
      )}
    </main>
  );
}

function QuickLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link href={href} style={quickLinkStyle}>
      {label}
    </Link>
  );
}

function QuickAction({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link href={href} style={quickActionStyle}>
      {label}
    </Link>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const quickLinkStyle = {
  padding: "12px 16px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.7)",
  border: "1px solid var(--border)",
  fontWeight: 700,
} as const;

const quickActionStyle = {
  padding: "14px 16px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.78)",
  border: "1px solid var(--border)",
  fontWeight: 700,
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

const loadingPanelStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  padding: 42,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
} as const;
