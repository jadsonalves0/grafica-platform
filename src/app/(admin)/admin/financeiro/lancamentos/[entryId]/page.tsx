"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EntryForm } from "@/app/(admin)/admin/financeiro/_components/entry-form";

type EntryDetail = {
  id: string;
  accountId: string;
  financialCategoryId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  quoteId?: string | null;
  entryType: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: string | null;
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

    loadEntry();

    return () => controller.abort();
  }, [entryId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando lancamento...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos preparando os dados financeiros.</span>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 1120, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 760 }}>
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
            Fluxo de caixa
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar lancamento
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Revise vencimento, conta, vinculos e status financeiro sem sair da operacao.
          </p>
        </div>

        <Link href="/admin/financeiro" style={secondaryButtonStyle}>
          Voltar para financeiro
        </Link>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {entry ? (
        <EntryForm
          mode="edit"
          entryId={entry.id}
          initialState={{
            accountId: entry.accountId,
            financialCategoryId: entry.financialCategoryId ?? "",
            customerId: entry.customerId ?? "",
            orderId: entry.orderId ?? "",
            quoteId: entry.quoteId ?? "",
            entryType: entry.entryType,
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
      ) : null}
    </main>
  );
}

const secondaryButtonStyle = {
  height: 48,
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
