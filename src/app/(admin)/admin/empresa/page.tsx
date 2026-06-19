"use client";

import {
  Alert,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";
import { useEffect, useState } from "react";

type CompanyDetail = {
  id: string;
  legalName: string;
  tradeName: string;
  slug: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  status: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EmpresaPage() {
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCompany() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/companies/current", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<CompanyDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os dados da empresa.");
          return;
        }

        setCompany(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar a empresa atual.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCompany();

    return () => controller.abort();
  }, []);

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--medium">
      <PageHeader
        breadcrumbs={[{ label: "Administracao" }, { label: "Empresa" }]}
        title="Empresa"
        description="Revise a identidade da empresa usada no isolamento dos dados, no website e na operacao comercial."
        secondaryActions={[
          { href: "/admin/site", label: "Configurar site", variant: "secondary" },
          { href: "/admin/parametros", label: "Ver parametros", variant: "secondary" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar a empresa.">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Carregando dados da empresa">
          <Skeleton lines={7} />
        </SectionCard>
      ) : company ? (
        <>
          <section className="admin-card-grid">
            <MetricCard label="Slug publico" value={`/${company.slug}`} description="Endereco principal do website." />
            <MetricCard label="Status" value={formatStatus(company.status)} description="Situacao atual da conta." />
            <MetricCard label="Telefone" value={company.phone || "Nao informado"} />
            <MetricCard label="WhatsApp" value={company.whatsapp || "Nao informado"} />
          </section>

          <SectionCard
            title="Dados da empresa"
            description="Use este painel para confirmar rapidamente as informacoes base antes de configurar o restante da plataforma."
          >
            <div className="admin-panel-grid">
              <InfoBox label="Razao social" value={company.legalName} />
              <InfoBox label="Nome fantasia" value={company.tradeName} />
              <InfoBox label="Documento" value={company.document || "Nao informado"} />
              <InfoBox label="E-mail" value={company.email || "Nao informado"} />
            </div>

            <div className="admin-row">
              <span className="admin-list-card__subtitle">Situacao operacional</span>
              <StatusBadge status={formatStatus(company.status)} tone={mapStatusTone(company.status)} />
            </div>
          </SectionCard>
        </>
      ) : (
        <EmptyState
          title="Empresa nao encontrada"
          description="Nao foi possivel localizar a empresa atual para esta sessao."
        />
      )}
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

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRIAL: "Teste",
    SUSPENDED: "Suspensa",
    CANCELED: "Cancelada",
  };

  return labels[status] ?? status;
}

function mapStatusTone(status: string) {
  const tones: Record<string, "success" | "warning" | "danger" | "neutral"> = {
    ACTIVE: "success",
    TRIAL: "warning",
    SUSPENDED: "danger",
    CANCELED: "neutral",
  };

  return tones[status] ?? "neutral";
}
