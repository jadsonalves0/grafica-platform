"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type SaleRow = {
  id: string;
  accountName: string;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string | null;
  itemCount?: number;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function VendasPage() {
  const searchParams = useSearchParams();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const feedback = searchParams.get("feedback");

    if (feedback === "entry-created") {
      setSuccessMessage("Venda cadastrada com sucesso.");
    } else if (feedback === "entry-updated") {
      setSuccessMessage("Venda atualizada com sucesso.");
    } else {
      setSuccessMessage(null);
      return undefined;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSales() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/financial/entries", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<SaleRow[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar as vendas.");
          return;
        }

        setSales(
          result.data.filter((entry) => entry.itemCount && entry.itemCount > 0),
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar as vendas.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSales();

    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const validSales = sales.filter((sale) => sale.status !== "CANCELED");
    const paidSales = validSales.filter((sale) => sale.status === "PAID");
    const pendingSales = validSales.filter((sale) => sale.status === "PENDING");

    return {
      totalSales: validSales.length,
      totalAmount: validSales.reduce((sum, sale) => sum + sale.amount, 0),
      paidAmount: paidSales.reduce((sum, sale) => sum + sale.amount, 0),
      pendingAmount: pendingSales.reduce((sum, sale) => sum + sale.amount, 0),
    };
  }, [sales]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Vendas"
        description="Acompanhe as vendas com itens e o que ainda esta pendente, sem misturar esse fluxo com lancamentos administrativos."
        primaryAction={{ href: "/admin/vendas/novo", label: "Nova venda" }}
        secondaryActions={[{ href: "/admin/financeiro", label: "Ver financeiro", variant: "secondary" }]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Vendas registradas" value={String(summary.totalSales)} description="Operacoes com itens no periodo." />
        <MetricCard label="Total vendido" value={formatCurrency(summary.totalAmount)} description="Soma das vendas validas." />
        <MetricCard label="Recebido" value={formatCurrency(summary.paidAmount)} description="Vendas ja baixadas." />
        <MetricCard label="Pendente" value={formatCurrency(summary.pendingAmount)} description="Valores ainda em aberto." />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar as vendas.">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <SectionCard title="Historico recente">
        {isLoading ? (
          <Skeleton lines={6} />
        ) : sales.length === 0 ? (
          <EmptyState
            title="Nenhuma venda registrada"
            description="Cadastre a primeira venda para iniciar o historico comercial do balcao."
            action={{ href: "/admin/vendas/novo", label: "Registrar primeira venda" }}
          />
        ) : (
          <div className="admin-list-stack">
            {sales.map((sale) => (
              <article key={sale.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">
                      {sale.description || "Venda sem observacao"}
                    </strong>
                    <span className="admin-list-card__subtitle">
                      {sale.accountName} | {sale.category}
                    </span>
                  </div>
                  <StatusBadge status={formatStatus(sale.status)} tone={statusTone(sale.status)} />
                </div>

                <div className="admin-list-card__meta">
                  <SmallStat label="Itens" value={String(sale.itemCount ?? 0)} />
                  <SmallStat label="Valor" value={formatCurrency(sale.amount)} />
                  <SmallStat label="Vencimento" value={formatDate(sale.dueDate)} />
                  <SmallStat label="Baixa" value={sale.paidAt ? formatDate(sale.paidAt) : "Em aberto"} />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Consulte os itens vendidos e acompanhe o reflexo financeiro desta venda.
                  </span>
                  <Link href={`/admin/vendas/${sale.id}`} className="admin-button admin-button--secondary">
                    Abrir venda
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

function formatStatus(status: SaleRow["status"]) {
  const labels: Record<SaleRow["status"], string> = {
    PENDING: "Pendente",
    PAID: "Paga",
    OVERDUE: "Vencida",
    CANCELED: "Cancelada",
  };

  return labels[status];
}

function statusTone(status: SaleRow["status"]) {
  const tones: Record<SaleRow["status"], "warning" | "success" | "danger"> = {
    PENDING: "warning",
    PAID: "success",
    OVERDUE: "danger",
    CANCELED: "danger",
  };

  return tones[status];
}
