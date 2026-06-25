"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EntryForm } from "@/app/(admin)/admin/financeiro/_components/entry-form";
import {
  Alert,
  EmptyState,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type EntryDetail = {
  id: string;
  accountId: string;
  accountName: string;
  financialCategoryId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  inventoryEntryId?: string | null;
  inventoryEntryDocumentNumber?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  quoteId?: string | null;
  quoteCode?: string | null;
  entryType: "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "TRANSFER";
  originType: "MANUAL" | "ENTRY" | "PRODUCTION" | "ORDER" | "QUOTE" | "WEBSITE";
  originLabel: string;
  originHref?: string | null;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarLancamentoPage() {
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEntry() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/financial/entries/${entryId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<EntryDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o lancamento.");
          return;
        }

        setEntry(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setErrorMessage("Falha ao consultar o lancamento.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadEntry();

    return () => controller.abort();
  }, [entryId]);

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--medium">
      <PageHeader
        title="Detalhe financeiro"
        description="Revise vencimento, origem, parcelas e situacao financeira sem confundir este registro com o fluxo comercial da venda."
        primaryAction={
          entry?.items.length && (entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE")
            ? { href: `/admin/vendas/${entry.id}`, label: "Abrir venda" }
            : undefined
        }
        secondaryActions={[{ href: "/admin/financeiro", label: "Voltar para financeiro", variant: "secondary" }]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel abrir o lancamento.">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Carregando lancamento">
          <Skeleton lines={7} />
        </SectionCard>
      ) : entry ? (
        <>
          <SectionCard title="Resumo do lancamento" description="Veja primeiro a origem e o papel desse valor dentro da operacao.">
            <div className="admin-summary-list">
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Origem</span>
                {entry.originHref ? (
                  <Link href={entry.originHref} className="admin-link-button">
                    {entry.originLabel}
                  </Link>
                ) : (
                  <strong>{entry.originLabel}</strong>
                )}
              </div>
              {entry.items.length && (entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE") ? (
                <div className="admin-summary-row">
                  <span style={{ color: "var(--muted)" }}>Venda vinculada</span>
                  <Link href={`/admin/vendas/${entry.id}`} className="admin-link-button">
                    Venda #{entry.id.slice(0, 8).toUpperCase()}
                  </Link>
                </div>
              ) : null}
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Natureza</span>
                <strong>{formatEntryType(entry.entryType)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Conta</span>
                <strong>{entry.accountName}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Valor</span>
                <strong>{formatCurrency(entry.amount)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Status</span>
                <StatusBadge status={formatFinancialStatus(entry.status)} tone={mapFinancialTone(entry.status)} />
              </div>
              {entry.installmentCount ? (
                <div className="admin-summary-row">
                  <span style={{ color: "var(--muted)" }}>Parcela</span>
                  <strong>
                    {entry.installmentNumber ?? 1} de {entry.installmentCount}
                  </strong>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <EntryForm
            mode="edit"
            entryId={entry.id}
            initialState={{
              accountId: entry.accountId,
              financialCategoryId: entry.financialCategoryId ?? "",
              customerId: entry.customerId ?? "",
              orderId: entry.orderId ?? "",
              quoteId: entry.quoteId ?? "",
              entryType:
                entry.entryType === "INCOME" || entry.entryType === "RECEIVABLE"
                  ? "INCOME"
                  : "EXPENSE",
              category: entry.category,
              description: entry.description,
              amount: new Intl.NumberFormat("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(entry.amount),
              dueDate: entry.dueDate.slice(0, 10),
              status: entry.status,
              items: entry.items.map((item) => ({
                id: item.id,
                productId: item.productId ?? "",
                description: item.description,
                quantity: new Intl.NumberFormat("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 3,
                }).format(item.quantity),
                unitPrice: new Intl.NumberFormat("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(item.unitPrice),
              })),
            }}
            metadata={{
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
              paidAt: entry.paidAt,
            }}
          />
        </>
      ) : (
        <EmptyState
          title="Lancamento nao encontrado"
          description="Volte para a visao financeira e tente abrir o registro novamente."
          action={{ href: "/admin/financeiro", label: "Ir para financeiro" }}
        />
      )}
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatEntryType(type: EntryDetail["entryType"]) {
  if (type === "RECEIVABLE") return "Conta a receber";
  if (type === "PAYABLE") return "Conta a pagar";
  if (type === "TRANSFER") return "Transferencia";
  return type === "INCOME" ? "Receita" : "Despesa";
}

function formatFinancialStatus(status: EntryDetail["status"]) {
  if (status === "PAID") return "Pago";
  if (status === "OVERDUE") return "Vencido";
  if (status === "CANCELED") return "Cancelado";
  return "Pendente";
}

function mapFinancialTone(status: EntryDetail["status"]) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "danger" as const;
  if (status === "CANCELED") return "neutral" as const;
  return "warning" as const;
}
