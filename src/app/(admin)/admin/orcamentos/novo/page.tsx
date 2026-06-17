"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function NovoOrcamentoPage() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [customersResponse, productsResponse] = await Promise.all([
          fetch("/api/customers", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inventory/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const customersResult = (await customersResponse.json()) as CustomersResponse;
        const productsResult = (await productsResponse.json()) as ProductsResponse;

        if (!customersResponse.ok || !customersResult.success || !customersResult.data) {
          setErrorMessage(customersResult.message ?? "Nao foi possivel carregar os clientes.");
          setCustomers([]);
          return;
        }

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens.");
          setProducts([]);
          return;
        }

        setCustomers(customersResult.data);
        setProducts(productsResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar clientes e itens para o orcamento.");
        setCustomers([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomers();

    return () => controller.abort();
  }, []);

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
            Nova proposta
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Novo orcamento
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Monte a proposta comercial escolhendo o cliente, definindo a validade e
            construindo os itens com calculo automatico.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/orcamentos" style={secondaryButtonStyle}>
            Voltar para orcamentos
          </Link>
          <Link href="/admin/clientes/novo" style={ghostButtonStyle}>
            Cadastrar cliente
          </Link>
        </div>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {isLoading ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando base comercial...</strong>
          <span style={{ color: "var(--muted)" }}>
            Estamos trazendo clientes e itens cadastrados.
          </span>
        </section>
      ) : (
        <QuoteForm mode="create" customers={customers} products={products} />
      )}
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
