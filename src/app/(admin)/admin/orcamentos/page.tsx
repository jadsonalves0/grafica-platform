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

type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

type QuoteListItem = {
  id: string;
  code: string;
  status: QuoteStatus;
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

type StatusFilter = "all" | QuoteStatus;

function readStatusFilter(value: string | null): StatusFilter {
  return value === "DRAFT" ||
    value === "SENT" ||
    value === "APPROVED" ||
    value === "REJECTED" ||
    value === "EXPIRED"
    ? value
    : "all";
}

export default function OrcamentosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    readStatusFilter(searchParams.get("status")),
  );
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setStatusFilter(readStatusFilter(searchParams.get("status")));
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

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, search, searchParams, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuotes() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim()
          ? `?search=${encodeURIComponent(search.trim())}`
          : "";
        const response = await fetch(`/api/quotes${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as QuotesResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(
            result.message ?? "Nao foi possivel carregar os orcamentos.",
          );
          setQuotes([]);
          return;
        }

        setQuotes(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage(
          "Nao foi possivel carregar os orcamentos. Tente novamente.",
        );
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

  const filteredQuotes = useMemo(() => {
    if (statusFilter === "all") {
      return quotes;
    }

    return quotes.filter((quote) => quote.status === statusFilter);
  }, [quotes, statusFilter]);

  const stats = useMemo(() => {
    const approvedQuotes = quotes.filter((quote) => quote.status === "APPROVED");
    const openQuotes = quotes.filter(
      (quote) => quote.status === "DRAFT" || quote.status === "SENT",
    );

    return [
      {
        label: "Propostas abertas",
        value: String(openQuotes.length),
        description: "Rascunhos e propostas aguardando retorno.",
      },
      {
        label: "Aprovados",
        value: String(approvedQuotes.length),
        description: "Prontos para seguir para pedido quando aplicavel.",
      },
      {
        label: "Valor aprovado",
        value: formatCurrency(
          approvedQuotes.reduce((sum, quote) => sum + quote.totalAmount, 0),
        ),
        description: "Volume comercial ja aceito pelos clientes.",
      },
      {
        label: "Total emitido",
        value: formatCurrency(
          quotes.reduce((sum, quote) => sum + quote.totalAmount, 0),
        ),
        description: "Soma dos valores orcados na base atual.",
      },
    ];
  }, [quotes]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Orcamentos"
        description="Acompanhe a carteira de propostas e avance rapidamente o proximo passo comercial."
        primaryAction={{
          href: "/admin/orcamentos/novo",
          label: "Novo orcamento",
        }}
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

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar os orcamentos.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Pipeline comercial"
      >
        <FilterBar
          resultsCount={filteredQuotes.length}
          activeFilters={statusFilter !== "all" ? [`Status: ${formatStatus(statusFilter)}`] : []}
          onClear={
            search || statusFilter !== "all"
              ? () => {
                  setSearch("");
                  setStatusFilter("all");
                }
              : undefined
          }
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar orcamento ou cliente"
            label="Buscar orcamento ou cliente"
          />
          <label className="admin-field">
            <span className="admin-field__label">Status</span>
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(readStatusFilter(event.target.value))
              }
            >
              <option value="all">Todos</option>
              <option value="DRAFT">Rascunho</option>
              <option value="SENT">Enviado</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Recusado</option>
              <option value="EXPIRED">Expirado</option>
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : filteredQuotes.length === 0 ? (
          <EmptyState
            title="Nenhum orcamento encontrado"
            description="Crie a primeira proposta ou ajuste os filtros para localizar um orcamento existente."
            action={{
              href: "/admin/orcamentos/novo",
              label: "Criar orcamento",
            }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredQuotes.map((quote) => (
              <article key={quote.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{quote.code}</strong>
                    <span className="admin-list-card__subtitle">
                      {quote.customerName}
                    </span>
                  </div>
                  <StatusBadge
                    status={formatStatus(quote.status)}
                    tone={mapStatusTone(quote.status)}
                  />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox
                    label="Emitido em"
                    value={formatDate(quote.issueDate)}
                  />
                  <InfoBox
                    label="Validade"
                    value={
                      quote.validUntil
                        ? formatDate(quote.validUntil)
                        : "Nao informada"
                    }
                  />
                  <InfoBox
                    label="Total"
                    value={formatCurrency(quote.totalAmount)}
                  />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Revise itens, atualize desconto e siga para aprovacao ou pedido.
                  </span>
                  <Link
                    href={`/admin/orcamentos/${quote.id}`}
                    className="admin-button admin-button--secondary"
                  >
                    Abrir orcamento
                  </Link>
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

function formatStatus(status: QuoteStatus) {
  const labels: Record<QuoteStatus, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
    EXPIRED: "Expirado",
  };

  return labels[status];
}

function mapStatusTone(status: QuoteStatus) {
  const tones: Record<QuoteStatus, "neutral" | "info" | "success" | "danger"> =
    {
      DRAFT: "neutral",
      SENT: "info",
      APPROVED: "success",
      REJECTED: "danger",
      EXPIRED: "danger",
    };

  return tones[status];
}
