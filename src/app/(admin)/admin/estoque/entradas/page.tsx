"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type EntryRow = {
  id: string;
  entryType: string;
  supplierName?: string | null;
  documentNumber: string;
  entryDate: string;
  financialCondition: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELED";
  subtotal: number;
  totalAmount: number;
  itemsCount: number;
  createdAt: string;
  confirmedAt?: string | null;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EntradasPage() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "CONFIRMED" | "CANCELED">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const feedback = searchParams.get("feedback");
    const messages: Record<string, string> = {
      "entry-created": "Entrada criada com sucesso.",
      "entry-updated": "Entrada atualizada com sucesso.",
      "entry-confirmed": "Entrada confirmada com sucesso.",
      "entry-canceled": "Entrada cancelada com sucesso.",
    };

    if (!feedback || !messages[feedback]) {
      setSuccessMessage(null);
      return undefined;
    }

    setSuccessMessage(messages[feedback]);
    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEntries() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (status !== "ALL") params.set("status", status);

        const response = await fetch(`/api/inventory/entries?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<EntryRow[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar as entradas.");
          return;
        }

        setEntries(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setErrorMessage("Falha ao carregar as entradas.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadEntries();

    return () => controller.abort();
  }, [search, status]);

  const totals = useMemo(
    () => ({
      draft: entries.filter((entry) => entry.status === "DRAFT").length,
      confirmed: entries.filter((entry) => entry.status === "CONFIRMED").length,
      totalAmount: entries.reduce((sum, entry) => sum + entry.totalAmount, 0),
    }),
    [entries],
  );

  const activeFilters = useMemo(
    () => (status !== "ALL" ? [`Status: ${formatEntryStatus(status)}`] : []),
    [status],
  );

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Entradas"
        description="Registre e acompanhe documentos que adicionam materiais e produtos ao estoque."
        primaryAction={{ href: "/admin/estoque/entradas/novo", label: "Nova entrada" }}
        secondaryActions={[{ href: "/admin/estoque/posicao", label: "Ver estoque", variant: "secondary" }]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Rascunhos" value={String(totals.draft)} description="Documentos ainda em edicao." />
        <MetricCard label="Confirmadas" value={String(totals.confirmed)} description="Ja integradas ao estoque." />
        <MetricCard label="Valor listado" value={formatCurrency(totals.totalAmount)} description="Soma das entradas exibidas." />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar as entradas">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <SectionCard title="Documentos de entrada">
        <FilterBar
          resultsCount={entries.length}
          activeFilters={activeFilters}
          onClear={
            search || status !== "ALL"
              ? () => {
                  setSearch("");
                  setStatus("ALL");
                }
              : undefined
          }
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar fornecedor ou numero do documento"
            label="Buscar fornecedor ou numero do documento"
          />
          <label className="admin-field">
            <span className="admin-field__label">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="admin-select"
              aria-label="Filtrar por status"
            >
              <option value="ALL">Todos os status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={6} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Nenhuma entrada encontrada"
            description="Ajuste os filtros ou registre a primeira entrada para iniciar o historico de abastecimento."
            action={{ href: "/admin/estoque/entradas/novo", label: "Registrar primeira entrada" }}
          />
        ) : (
          <div className="admin-list-stack">
            {entries.map((entry) => (
              <article key={entry.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{entry.documentNumber}</strong>
                    <span className="admin-list-card__subtitle">
                      {formatEntryType(entry.entryType)} | {entry.supplierName || "Sem fornecedor"} | {formatDate(entry.entryDate)}
                    </span>
                  </div>
                  <StatusBadge status={formatEntryStatus(entry.status)} tone={entryTone(entry.status)} />
                </div>

                <div className="admin-list-card__meta">
                  <SmallStat label="Itens" value={String(entry.itemsCount)} />
                  <SmallStat label="Condicao" value={formatFinancialCondition(entry.financialCondition)} />
                  <SmallStat label="Subtotal" value={formatCurrency(entry.subtotal)} />
                  <SmallStat label="Total" value={formatCurrency(entry.totalAmount)} />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Criada em {formatDate(entry.createdAt)}
                    {entry.confirmedAt ? ` | Confirmada em ${formatDate(entry.confirmedAt)}` : ""}
                  </span>
                  <Link href={`/admin/estoque/entradas/${entry.id}`} className="admin-button admin-button--secondary">
                    Abrir entrada
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

function SmallStat({ label, value }: Readonly<{ label: string; value: string }>) {
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
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatEntryStatus(value: EntryRow["status"]) {
  if (value === "CONFIRMED") return "Confirmada";
  if (value === "CANCELED") return "Cancelada";
  return "Rascunho";
}

function formatEntryType(value: string) {
  const labels: Record<string, string> = {
    PURCHASE_INVOICE: "Nota fiscal de compra",
    PURCHASE_WITHOUT_INVOICE: "Compra sem nota",
    INITIAL_BALANCE: "Saldo inicial",
    RETURN: "Devolucao",
    BONUS: "Bonificacao",
    OTHER: "Outra entrada",
  };

  return labels[value] ?? value;
}

function formatFinancialCondition(value: string) {
  const labels: Record<string, string> = {
    NONE: "Sem financeiro",
    CASH: "A vista",
    TERM: "A prazo",
  };

  return labels[value] ?? value;
}

function entryTone(status: EntryRow["status"]) {
  const tones: Record<EntryRow["status"], "neutral" | "success" | "danger"> = {
    DRAFT: "neutral",
    CONFIRMED: "success",
    CANCELED: "danger",
  };

  return tones[status];
}
