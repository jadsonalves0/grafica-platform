"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { QuoteForm } from "@/app/(admin)/admin/orcamentos/_components/quote-form";
import {
  Alert,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type CustomerOption = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: string;
  currentStock: number;
  salePrice: number;
  isActive: boolean;
};

type CustomersResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    id: string;
    name: string;
    email?: string | null;
    whatsapp?: string | null;
  }>;
};

type ProductsResponse = {
  success: boolean;
  message?: string;
  data?: ProductOption[];
};

type QuoteDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    customerId: string;
    customerName: string;
    validUntil?: string | null;
    discountAmount: number;
    notes?: string | null;
    status: string;
    code: string;
    items: Array<{
      id: string;
      productId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
};

export default function EditarOrcamentoPage() {
  const params = useParams<{ quoteId: string }>();
  const quoteId = params.quoteId;
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [quote, setQuote] = useState<QuoteDetailResponse["data"]>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [customersResponse, productsResponse, quoteResponse] = await Promise.all([
          fetch("/api/customers?includeInactive=true", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inventory/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/quotes/${quoteId}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const customersResult = (await customersResponse.json()) as CustomersResponse;
        const productsResult = (await productsResponse.json()) as ProductsResponse;
        const quoteResult = (await quoteResponse.json()) as QuoteDetailResponse;

        if (!customersResponse.ok || !customersResult.success || !customersResult.data) {
          setErrorMessage(customersResult.message ?? "Nao foi possivel carregar clientes.");
          return;
        }

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens.");
          return;
        }

        if (!quoteResponse.ok || !quoteResult.success || !quoteResult.data) {
          setErrorMessage(quoteResult.message ?? "Nao foi possivel carregar o orcamento.");
          return;
        }

        setCustomers(customersResult.data);
        setProducts(productsResult.data);
        setQuote(quoteResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os dados do orcamento.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();

    return () => controller.abort();
  }, [quoteId]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title={quote?.code ? `Orcamento ${quote.code}` : "Editar orcamento"}
        description="Revise cliente, itens, validade e valores antes de aprovar ou converter a proposta."
        secondaryActions={[
          { href: "/admin/orcamentos", label: "Voltar para orcamentos" },
          { href: "/admin/clientes", label: "Ver clientes", variant: "secondary" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o orcamento.">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard
          title="Carregando proposta"
          description="Estamos preparando os dados do cliente, dos itens e do historico da proposta."
        >
          <Skeleton lines={8} />
        </SectionCard>
      ) : quote ? (
        <>
          <section className="admin-card-grid">
            <MetricCard label="Cliente" value={quote.customerName} />
            <MetricCard
              label="Validade"
              value={quote.validUntil ? formatDate(quote.validUntil) : "Nao informada"}
            />
            <MetricCard
              label="Itens"
              value={String(quote.items.length)}
            />
            <div>
              <SectionCard title="Status atual">
                <StatusBadge
                  status={formatQuoteStatus(quote.status)}
                  tone={mapQuoteTone(quote.status)}
                />
              </SectionCard>
            </div>
          </section>

          <QuoteForm
            mode="edit"
            customers={customers}
            products={products}
            initialData={quote}
            quoteId={quoteId}
          />
        </>
      ) : null}
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatQuoteStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
    EXPIRED: "Expirado",
  };

  return labels[status] ?? status;
}

function mapQuoteTone(status: string) {
  const tones: Record<string, "neutral" | "info" | "success" | "danger"> = {
    DRAFT: "neutral",
    SENT: "info",
    APPROVED: "success",
    REJECTED: "danger",
    EXPIRED: "danger",
  };

  return tones[status] ?? "neutral";
}
