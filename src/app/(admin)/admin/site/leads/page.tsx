"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
  Tabs,
} from "@/components/admin/ui";
import { formatPhone } from "@/lib/forms/br-utils";

type LeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "ARCHIVED";

type SiteLead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  subject?: string | null;
  requestedService?: string | null;
  status: LeadStatus;
  createdAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function SiteLeadsPage() {
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | LeadStatus>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadLeads(statusFilter);
  }, [statusFilter]);

  const leadStats = useMemo(
    () => ({
      total: leads.length,
      newCount: leads.filter((lead) => lead.status === "NEW").length,
      contacted: leads.filter((lead) => lead.status === "CONTACTED").length,
      converted: leads.filter((lead) => lead.status === "CONVERTED").length,
    }),
    [leads],
  );

  async function loadLeads(filter: "ALL" | LeadStatus) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`;
      const response = await fetch(`/api/site/leads${query}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResult<SiteLead[]>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel carregar os leads.");
        return;
      }

      setLeads(result.data);
    } catch {
      setErrorMessage("Falha ao carregar os leads do site.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(leadId: string, status: LeadStatus) {
    setBusyLeadId(leadId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/site/leads/${leadId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json()) as ApiResult<{ updated: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o lead.");
        return;
      }

      setSuccessMessage("Status do lead atualizado.");
      await loadLeads(statusFilter);
    } catch {
      setErrorMessage("Falha ao atualizar o lead.");
    } finally {
      setBusyLeadId(null);
    }
  }

  async function convertLead(leadId: string) {
    setBusyLeadId(leadId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/site/leads/${leadId}/status?action=convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = (await response.json()) as ApiResult<{ customerName: string }>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel converter o lead em cliente.");
        return;
      }

      setSuccessMessage(`Lead convertido em cliente: ${result.data.customerName}.`);
      await loadLeads(statusFilter);
    } catch {
      setErrorMessage("Falha ao converter o lead.");
    } finally {
      setBusyLeadId(null);
    }
  }

  async function createQuoteFromLead(lead: SiteLead) {
    setBusyLeadId(lead.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/site/leads/${lead.id}/status?action=quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              description: lead.requestedService || lead.subject || "Servico solicitado pelo site",
              quantity: 1,
              unitPrice: 0,
            },
          ],
          notes: lead.subject || lead.requestedService || "",
        }),
      });

      const result = (await response.json()) as ApiResult<{ quoteId: string; quoteCode: string }>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel gerar o orcamento.");
        return;
      }

      setSuccessMessage(`Orcamento ${result.data.quoteCode} criado com sucesso.`);
      window.location.href = `/admin/orcamentos/${result.data.quoteId}`;
    } catch {
      setErrorMessage("Falha ao gerar o orcamento.");
      setBusyLeadId(null);
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Website" }, { label: "Leads do site" }]}
        title="Leads do site"
        description="Acompanhe contatos recebidos, avance o atendimento e transforme a oportunidade em cliente ou orcamento."
        secondaryActions={[{ href: "/admin/site", label: "Voltar para website", variant: "secondary" }]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Leads na tela" value={String(leadStats.total)} />
        <MetricCard label="Novos" value={String(leadStats.newCount)} />
        <MetricCard label="Em atendimento" value={String(leadStats.contacted)} />
        <MetricCard label="Convertidos" value={String(leadStats.converted)} />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel concluir a operacao.">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <SectionCard
        title="Fila de atendimento"
        description="Filtre os leads por status e avance o atendimento sem perder o historico."
      >
        <Tabs
          tabs={[
            { id: "ALL", label: "Todos" },
            { id: "NEW", label: "Novos" },
            { id: "CONTACTED", label: "Em atendimento" },
            { id: "CONVERTED", label: "Convertidos" },
            { id: "ARCHIVED", label: "Arquivados" },
          ]}
          activeTab={statusFilter}
          onChange={(value) => setStatusFilter(value as "ALL" | LeadStatus)}
        />

        {isLoading ? (
          <Skeleton lines={8} />
        ) : leads.length === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Quando novos contatos chegarem pelo site, eles aparecerao aqui para atendimento."
          />
        ) : (
          <div className="admin-list-stack">
            {leads.map((lead) => {
              const isBusy = busyLeadId === lead.id;

              return (
                <article key={lead.id} className="admin-list-card">
                  <div className="admin-list-card__header">
                    <div className="admin-list-card__heading">
                      <strong className="admin-list-card__title">{lead.name}</strong>
                      <span className="admin-list-card__subtitle">
                        {lead.requestedService || lead.subject || "Contato geral"}
                      </span>
                    </div>
                    <StatusBadge status={formatLeadStatus(lead.status)} tone={leadTone(lead.status)} />
                  </div>

                  <div className="admin-list-card__meta">
                    <InfoBox label="E-mail" value={lead.email || "Nao informado"} />
                    <InfoBox label="Telefone" value={lead.phone ? formatPhone(lead.phone) : "Nao informado"} />
                    <InfoBox label="WhatsApp" value={lead.whatsapp ? formatPhone(lead.whatsapp) : "Nao informado"} />
                    <InfoBox label="Recebido em" value={formatDateTime(lead.createdAt)} />
                  </div>

                  <div className="admin-list-card__footer">
                    <span className="admin-list-card__hint">
                      Avance o atendimento, converta o contato em cliente ou gere um orcamento sem sair do contexto.
                    </span>
                    <div className="admin-row">
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "CONTACTED")}
                        disabled={isBusy}
                        className="admin-button admin-button--secondary"
                      >
                        {isBusy ? "Processando..." : "Marcar em atendimento"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void convertLead(lead.id)}
                        disabled={isBusy}
                        className="admin-button admin-button--ghost"
                      >
                        {isBusy ? "Processando..." : "Converter em cliente"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void createQuoteFromLead(lead)}
                        disabled={isBusy}
                        className="admin-button admin-button--primary"
                      >
                        {isBusy ? "Processando..." : "Gerar orcamento"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "ARCHIVED")}
                        disabled={isBusy}
                        className="admin-button admin-button--danger"
                      >
                        {isBusy ? "Processando..." : "Arquivar"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function InfoBox({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatLeadStatus(status: LeadStatus) {
  const labels: Record<LeadStatus, string> = {
    NEW: "Novo",
    CONTACTED: "Em atendimento",
    CONVERTED: "Convertido",
    ARCHIVED: "Arquivado",
  };

  return labels[status];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function leadTone(status: LeadStatus) {
  const tones: Record<LeadStatus, "warning" | "info" | "success" | "neutral"> = {
    NEW: "warning",
    CONTACTED: "info",
    CONVERTED: "success",
    ARCHIVED: "neutral",
  };

  return tones[status];
}
