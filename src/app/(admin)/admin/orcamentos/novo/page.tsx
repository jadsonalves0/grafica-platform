"use client";

import { useEffect, useState } from "react";

import { QuoteForm } from "@/app/(admin)/admin/orcamentos/_components/quote-form";
import {
  Alert,
  PageHeader,
  SectionCard,
  Skeleton,
} from "@/components/admin/ui";

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

type ProductsResponse = {
  success: boolean;
  message?: string;
  data?: ProductOption[];
};

export default function NovoOrcamentoPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const productsResponse = await fetch("/api/inventory/products", {
          signal: controller.signal,
          cache: "no-store",
        });
        const productsResult = (await productsResponse.json()) as ProductsResponse;

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens.");
          setProducts([]);
          return;
        }

        setProducts(productsResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar os itens para o orcamento.");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, []);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Novo orcamento"
        description="Monte a proposta comercial escolhendo o cliente, organizando os itens e revisando valores antes de enviar."
        secondaryActions={[
          { href: "/admin/orcamentos", label: "Voltar para orcamentos" },
          { href: "/admin/clientes/novo", label: "Cadastrar cliente", variant: "secondary" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel preparar o orcamento.">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard
          title="Carregando base comercial"
          description="Estamos trazendo os itens cadastrados para iniciar a proposta."
        >
          <Skeleton lines={7} />
        </SectionCard>
      ) : (
        <QuoteForm mode="create" customers={[]} products={products} />
      )}
    </main>
  );
}
