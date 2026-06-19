"use client";

import { useEffect, useState } from "react";

import { QuoteForm } from "@/app/(admin)/admin/orcamentos/_components/quote-form";
import {
  Alert,
  PageHeader,
  SectionCard,
  Skeleton,
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

    void loadCustomers();

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
          description="Estamos trazendo clientes e itens cadastrados para iniciar a proposta."
        >
          <Skeleton lines={7} />
        </SectionCard>
      ) : (
        <QuoteForm mode="create" customers={customers} products={products} />
      )}
    </main>
  );
}
