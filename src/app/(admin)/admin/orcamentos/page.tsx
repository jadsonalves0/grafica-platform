"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QuoteListItem = {
  id: string;
  code: string;
  status: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  issueDate: string;
  validUntil?: string | null;
};

type QuotesResponse = {
  success: boolean;
  message?: string;
  data?: QuoteListItem[];
};

export default function OrcamentosPage() {
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuotes() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const response = await fetch(`/api/quotes${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as QuotesResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os orcamentos.");
          setQuotes([]);
          return;
        }

        setQuotes(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os orcamentos.");
        setQuotes([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadQuotes, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  const stats = useMemo(() => {
    const approved = quotes.filter((quote) => quote.status === "APPROVED").length;
    const draft = quotes.filter((quote) => quote.status === "DRAFT").length;
    const sent = quotes.filter((quote) => quote.status === "SENT").length;
    const totalValue = quotes.reduce((sum, quote) => sum + quote.totalAmount, 0);

    return [
      { label: "Base total", value: String(quotes.length), description: "Propostas registradas." },
      { label: "Rascunhos", value: String(draft), description: "Ainda em preparacao." },
      { label: "Enviados", value: String(sent), description: "Aguardando retorno do cliente." },
      { label: "Aprovados", value: String(approved), description: formatCurrency(totalValue) },
    ];
  }, [quotes]);

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 780 }}>
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
              Operacao comercial
            </p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Orcamentos
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              O modulo de orcamentos concentra propostas, aprovacoes e transicao para
              pedidos. O objetivo aqui e dar visao rapida do pipeline e reduzir o tempo
              entre contato e venda.
            </p>
          </div>

          <Link href="/admin/orcamentos/novo" style={primaryButtonStyle}>
            Novo orcamento
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          {stats.map((stat) => (
            <article
              key={stat.label}
              style={{
                padding: 20,
                borderRadius: 22,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(232, 217, 202, 0.9)",
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
                {stat.label}
              </p>
              <h2 style={{ margin: "10px 0 6px", fontSize: 34 }}>{stat.value}</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{stat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Pipeline comercial</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Busque por codigo do orcamento ou nome do cliente.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar orcamento..."
            style={{
              ...inputStyle,
              width: "100%",
              maxWidth: 340,
              background: "#fff",
            }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

        {isLoading ? (
          <div style={{ ...emptyStateStyle, minHeight: 220 }}>
            <strong>Carregando orcamentos...</strong>
            <span style={{ color: "var(--muted)" }}>Estamos consultando as propostas da empresa.</span>
          </div>
        ) : quotes.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum orcamento encontrado.</strong>
            <span style={{ color: "var(--muted)" }}>
              Crie o primeiro orcamento ou refine o termo de busca.
            </span>
            <Link href="/admin/orcamentos/novo" style={secondaryButtonStyle}>
              Criar orcamento
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {quotes.map((quote) => (
              <article
                key={quote.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.4fr 0.9fr 0.9fr auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{quote.code}</strong>
                  <span style={{ color: "var(--muted)" }}>
                    Emissao {formatDate(quote.issueDate)}
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{quote.customerName}</strong>
                  <span style={{ color: "var(--muted)" }}>
                    Validade {quote.validUntil ? formatDate(quote.validUntil) : "nao informada"}
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Status</strong>
                  <span style={statusBadgeStyle(quote.status)}>{formatStatus(quote.status)}</span>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Total</strong>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(quote.totalAmount)}</span>
                </div>

                <Link href={`/admin/orcamentos/${quote.id}`} style={secondaryButtonStyle}>
                  Abrir
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
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

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
    EXPIRED: "Expirado",
  };

  return labels[status] ?? status;
}

function statusBadgeStyle(status: string) {
  const palette: Record<string, { background: string; color: string }> = {
    DRAFT: { background: "rgba(124, 95, 58, 0.12)", color: "#6a4f2f" },
    SENT: { background: "rgba(37, 99, 235, 0.12)", color: "#1f4db5" },
    APPROVED: { background: "rgba(43, 110, 82, 0.12)", color: "#245844" },
    REJECTED: { background: "rgba(167, 45, 45, 0.12)", color: "#8b2323" },
    EXPIRED: { background: "rgba(107, 114, 128, 0.14)", color: "#4b5563" },
  };

  const selected = palette[status] ?? palette.DRAFT;

  return {
    padding: "8px 10px",
    borderRadius: 999,
    background: selected.background,
    color: selected.color,
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
  };
}

const inputStyle = {
  height: 50,
  padding: "0 16px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "#fff",
  boxSizing: "border-box" as const,
} as const;

const primaryButtonStyle = {
  height: 50,
  padding: "0 20px",
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
  height: 42,
  padding: "0 16px",
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

const emptyStateStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  textAlign: "center" as const,
  padding: 36,
  borderRadius: 22,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.6)",
} as const;
