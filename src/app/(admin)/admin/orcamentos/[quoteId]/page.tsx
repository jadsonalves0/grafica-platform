"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { QuoteForm } from "@/app/(admin)/admin/orcamentos/_components/quote-form";

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

    loadData();

    return () => controller.abort();
  }, [quoteId]);

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: 860 }}>
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
            Gestao da proposta
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            {quote?.code ? `Orcamento ${quote.code}` : "Editar orcamento"}
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Ajuste itens, atualize valores e aprove a proposta quando ela estiver pronta
            para seguir para o pedido.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/orcamentos" style={secondaryButtonStyle}>
            Voltar para orcamentos
          </Link>
          <Link href="/admin/clientes" style={ghostButtonStyle}>
            Ver clientes
          </Link>
        </div>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {isLoading ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando proposta...</strong>
          <span style={{ color: "var(--muted)" }}>
            Estamos trazendo o orcamento, os clientes e o catalogo de itens.
          </span>
        </section>
      ) : quote ? (
        <QuoteForm
          mode="edit"
          customers={customers}
          products={products}
          initialData={quote}
          quoteId={quoteId}
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

const ghostButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
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
