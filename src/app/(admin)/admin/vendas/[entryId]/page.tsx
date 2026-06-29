"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { SaleForm } from "@/app/(admin)/admin/vendas/_components/sale-form";
import { Alert, EmptyState, PageHeader, SectionCard, Skeleton } from "@/components/admin/ui";

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

export default function EditarVendaPage() {
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
          setErrorMessage(result.message ?? "Nao foi possivel carregar a venda.");
          return;
        }

        if (result.data.entryType !== "INCOME" || !result.data.items.length) {
          setErrorMessage("Esse registro nao corresponde a uma venda com itens.");
          return;
        }

        setEntry(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar a venda.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadEntry();

    return () => controller.abort();
  }, [entryId]);

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        title={entry ? `Venda #${entry.id.slice(0, 8).toUpperCase()}` : "Detalhes da venda"}
        description="Revise os itens vendidos e acompanhe o reflexo financeiro sem sair do fluxo comercial."
        primaryAction={
          entry
            ? {
                href: `/admin/financeiro/lancamentos/${entry.id}`,
                label: entry.status === "PAID" ? "Abrir financeiro" : "Abrir conta a receber",
              }
            : undefined
        }
        secondaryActions={[{ href: "/admin/vendas", label: "Voltar para vendas", variant: "secondary" }]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel abrir a venda">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Carregando venda">
          <Skeleton lines={6} />
        </SectionCard>
      ) : entry ? (
        <SaleForm
          mode="edit"
          entryId={entry.id}
          initialData={{
            id: entry.id,
            status: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            paidAt: entry.paidAt,
            initialState: {
              accountId: entry.accountId,
              financialCategoryId: entry.financialCategoryId ?? "",
              customerId: entry.customerId ?? "",
              orderId: entry.orderId ?? "",
              quoteId: entry.quoteId ?? "",
              description: entry.description,
              dueDate: entry.dueDate.slice(0, 10),
              paymentStatus: entry.status === "PAID" ? "PAID" : "PENDING",
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
                discountAmount: "0,00",
              })),
            },
          }}
        />
      ) : (
        <EmptyState
          title="Venda nao encontrada"
          description="Volte para a listagem e tente abrir o registro novamente."
          action={{ href: "/admin/vendas", label: "Ir para vendas" }}
        />
      )}
    </main>
  );
}
