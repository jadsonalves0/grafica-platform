"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

  const leadStats = useMemo(() => {
    return {
      total: leads.length,
      newCount: leads.filter((lead) => lead.status === "NEW").length,
      contacted: leads.filter((lead) => lead.status === "CONTACTED").length,
      converted: leads.filter((lead) => lead.status === "CONVERTED").length,
    };
  }, [leads]);

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

      const result = (await response.json()) as ApiResult<{
        customerName: string;
      }>;

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
              description:
                lead.requestedService ||
                lead.subject ||
                "Servico solicitado pelo site",
              quantity: 1,
              unitPrice: 0,
            },
          ],
          notes: lead.subject || lead.requestedService || "",
        }),
      });

      const result = (await response.json()) as ApiResult<{
        quoteId: string;
        quoteCode: string;
      }>;

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
          <div style={{ maxWidth: 760 }}>
            <p style={eyebrowStyle}>Captacao comercial</p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Leads do site
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Centralize contatos recebidos no site, avance o atendimento e transforme a
              entrada comercial em cliente ou orcamento sem recadastro manual.
            </p>
          </div>

          <Link href="/admin/site" style={secondaryLinkStyle}>
            Voltar para site institucional
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          <SummaryCard label="Leads na tela" value={String(leadStats.total)} />
          <SummaryCard label="Novos" value={String(leadStats.newCount)} />
          <SummaryCard label="Em atendimento" value={String(leadStats.contacted)} />
          <SummaryCard label="Convertidos" value={String(leadStats.converted)} accent />
        </div>
      </section>

      <section
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Todos", value: "ALL" },
          { label: "Novos", value: "NEW" },
          { label: "Em atendimento", value: "CONTACTED" },
          { label: "Convertidos", value: "CONVERTED" },
          { label: "Arquivados", value: "ARCHIVED" },
        ].map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value as "ALL" | LeadStatus)}
              style={{
                ...filterButtonStyle,
                background: isActive ? "var(--primary)" : "#fff",
                color: isActive ? "#fff" : "inherit",
                borderColor: isActive ? "var(--primary)" : "var(--border)",
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      {isLoading ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando leads...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos consultando os contatos mais recentes.</span>
        </section>
      ) : leads.length === 0 ? (
        <section style={emptyPanelStyle}>
          Nenhum lead encontrado para esse filtro.
        </section>
      ) : (
        <section style={{ display: "grid", gap: 16 }}>
          {leads.map((lead) => {
            const isBusy = busyLeadId === lead.id;

            return (
              <article
                key={lead.id}
                style={{
                  display: "grid",
                  gap: 16,
                  padding: 22,
                  borderRadius: 22,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
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
                  <div style={{ maxWidth: 720 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <h2 style={{ margin: 0, fontSize: 28 }}>{lead.name}</h2>
                      <span style={statusBadgeStyle(lead.status)}>{formatLeadStatus(lead.status)}</span>
                    </div>
                    <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                      {lead.requestedService || lead.subject || "Lead geral de contato"}
                    </p>
                  </div>

                  <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    Recebido em {formatDateTime(lead.createdAt)}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  <InfoCard label="E-mail" value={lead.email || "Nao informado"} />
                  <InfoCard
                    label="Telefone"
                    value={lead.phone ? formatPhone(lead.phone) : "Nao informado"}
                  />
                  <InfoCard
                    label="WhatsApp"
                    value={lead.whatsapp ? formatPhone(lead.whatsapp) : "Nao informado"}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingTop: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void updateStatus(lead.id, "CONTACTED")}
                    disabled={isBusy}
                    style={secondaryButtonStyle}
                  >
                    {isBusy ? "Processando..." : "Marcar em atendimento"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void convertLead(lead.id)}
                    disabled={isBusy}
                    style={secondaryButtonStyle}
                  >
                    {isBusy ? "Processando..." : "Converter em cliente"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void createQuoteFromLead(lead)}
                    disabled={isBusy}
                    style={primaryButtonStyle}
                  >
                    {isBusy ? "Processando..." : "Gerar orcamento"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateStatus(lead.id, "ARCHIVED")}
                    disabled={isBusy}
                    style={ghostButtonStyle}
                  >
                    {isBusy ? "Processando..." : "Arquivar"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
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
      <p
        style={{
          margin: 0,
          color: accent ? "#245844" : "var(--primary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: 34 }}>{value}</h2>
    </article>
  );
}

function InfoCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <article
      style={{
        display: "grid",
        gap: 8,
        padding: 16,
        borderRadius: 18,
        background: "rgba(255,255,255,0.78)",
        border: "1px solid var(--border)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
      <strong>{value}</strong>
    </article>
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

function statusBadgeStyle(status: LeadStatus) {
  const palette: Record<LeadStatus, { background: string; color: string }> = {
    NEW: { background: "rgba(191, 132, 25, 0.12)", color: "#8d5a0a" },
    CONTACTED: { background: "rgba(43, 110, 82, 0.12)", color: "#245844" },
    CONVERTED: { background: "rgba(50, 92, 168, 0.12)", color: "#204f8a" },
    ARCHIVED: { background: "rgba(117, 117, 117, 0.16)", color: "#4b4b4b" },
  };

  return {
    padding: "8px 12px",
    borderRadius: 999,
    background: palette[status].background,
    color: palette[status].color,
    fontWeight: 700,
  };
}

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
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

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
} as const;

const primaryButtonStyle = {
  height: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  height: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const ghostButtonStyle = {
  height: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const secondaryLinkStyle = {
  height: 46,
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

const filterButtonStyle = {
  height: 42,
  padding: "0 16px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
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

const emptyPanelStyle = {
  padding: 24,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
  color: "var(--muted)",
} as const;
