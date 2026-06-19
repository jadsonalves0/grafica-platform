"use client";

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

type AuditRow = {
  id: string;
  entityName: string;
  recordId: string;
  action: string;
  previousData?: string | null;
  newData?: string | null;
  justification?: string | null;
  userName?: string | null;
  createdAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [entityName, setEntityName] = useState("");
  const [action, setAction] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAudit() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (entityName.trim()) params.set("entityName", entityName.trim());
        if (action) params.set("action", action);

        const response = await fetch(`/api/admin/audit?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<AuditRow[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar a auditoria.");
          return;
        }

        setRows(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setErrorMessage("Falha ao consultar a auditoria.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAudit();

    return () => controller.abort();
  }, [action, entityName]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      canceled: rows.filter((row) => row.action === "CANCEL").length,
      overrides: rows.filter((row) => row.action === "OVERRIDE").length,
    }),
    [rows],
  );

  const activeFilters = [
    entityName.trim() ? `Entidade: ${entityName.trim()}` : null,
    action ? `Acao: ${formatAction(action)}` : null,
  ].filter(Boolean) as string[];

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Administracao" }, { label: "Auditoria" }]}
        title="Auditoria"
        description="Consulte alteracoes sensiveis de preco, custo, estoque e documentos confirmados com menos ruído visual."
      />

      <section className="admin-card-grid">
        <MetricCard label="Eventos listados" value={String(summary.total)} description="Registros visiveis com os filtros atuais." />
        <MetricCard label="Cancelamentos" value={String(summary.canceled)} description="Acoes de reversao identificadas." />
        <MetricCard label="Excecoes" value={String(summary.overrides)} description="Liberacoes ou substituicoes rastreadas." />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar a auditoria.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Trilha operacional"
        description="Filtre por entidade ou acao para localizar rapidamente o evento que precisa de conferencia."
      >
        <FilterBar
          resultsCount={rows.length}
          activeFilters={activeFilters}
          onClear={
            entityName || action
              ? () => {
                  setEntityName("");
                  setAction("");
                }
              : undefined
          }
        >
          <SearchField
            value={entityName}
            onChange={setEntityName}
            placeholder="Buscar entidade ou registro"
            label="Buscar entidade ou registro"
          />
          <label className="admin-field">
            <span className="admin-field__label">Acao</span>
            <select value={action} onChange={(event) => setAction(event.target.value)} className="admin-select">
              <option value="">Todas as acoes</option>
              <option value="CREATE">Criacao</option>
              <option value="UPDATE">Atualizacao</option>
              <option value="CONFIRM">Confirmacao</option>
              <option value="CANCEL">Cancelamento</option>
              <option value="REVERSE">Estorno</option>
              <option value="OVERRIDE">Excecao</option>
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={8} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nenhum evento encontrado"
            description="Ajuste os filtros para localizar a alteracao que voce precisa conferir."
          />
        ) : (
          <div className="admin-list-stack">
            {rows.map((row) => (
              <article key={row.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">
                      {row.entityName} | {row.recordId}
                    </strong>
                    <span className="admin-list-card__subtitle">
                      {row.userName || "Sistema"} | {formatDate(row.createdAt)}
                    </span>
                  </div>
                  <StatusBadge status={formatAction(row.action)} tone={actionTone(row.action)} />
                </div>

                {row.justification ? (
                  <span className="admin-list-card__hint">Justificativa: {row.justification}</span>
                ) : null}

                <div className="admin-panel-grid">
                  <JsonBox title="Antes" value={row.previousData} />
                  <JsonBox title="Depois" value={row.newData} />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function JsonBox({ title, value }: Readonly<{ title: string; value?: string | null }>) {
  return (
    <section className="admin-surface-muted">
      <strong>{title}</strong>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {value || "Sem dados registrados."}
      </pre>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAction(value: string) {
  const labels: Record<string, string> = {
    CREATE: "Criacao",
    UPDATE: "Atualizacao",
    CONFIRM: "Confirmacao",
    CANCEL: "Cancelamento",
    REVERSE: "Estorno",
    OVERRIDE: "Excecao",
  };

  return labels[value] ?? value;
}

function actionTone(action: string) {
  const tones: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
    CREATE: "success",
    UPDATE: "info",
    CONFIRM: "warning",
    CANCEL: "danger",
    REVERSE: "info",
    OVERRIDE: "neutral",
  };

  return tones[action] ?? "neutral";
}
