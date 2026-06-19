"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductForm } from "@/app/(admin)/admin/estoque/_components/product-form";
import { Alert, PageHeader, SectionCard, Skeleton } from "@/components/admin/ui";
import { normalizeDecimalInput } from "@/lib/forms/br-utils";

type ProductDetail = {
  id: string;
  categoryId?: string | null;
  categoryName?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  unit: string;
  controlsStock: boolean;
  showOnWebsite: boolean;
  desiredMargin?: number | null;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
  currentStock: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  priceHistories: Array<{
    id: string;
    changeType: "COST" | "PRICE";
    previousValue: number;
    newValue: number;
    origin: string;
    relatedDocument?: string | null;
    justification?: string | null;
    changedByUserName?: string | null;
    createdAt: string;
  }>;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarItemEstoquePage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/inventory/products/${productId}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<ProductDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o item.");
          return;
        }

        setProduct(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o item.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [productId]);

  if (isLoading) {
    return (
      <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
        <PageHeader
          breadcrumbs={[{ label: "Cadastros" }, { label: "Itens" }, { label: "Editar item" }]}
          title="Editar item"
          description="Estamos carregando os dados do catalogo para revisao."
          secondaryActions={[{ href: "/admin/estoque", label: "Voltar para itens", variant: "secondary" }]}
        />
        <SectionCard title="Carregando item">
          <Skeleton lines={6} />
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Itens" }, { label: "Editar item" }]}
        title="Editar item"
        description="Atualize os dados do item para manter orcamentos, pedidos e movimentacoes coerentes."
        secondaryActions={[
          { href: "/admin/estoque", label: "Voltar para itens", variant: "secondary" },
          {
            href: product ? `/admin/estoque/movimentar?productId=${product.id}` : "/admin/estoque/movimentar",
            label: "Movimentar estoque",
            variant: "secondary",
          },
          ...(product?.type === "FINISHED_PRODUCT"
            ? [
                { href: `/admin/estoque/${product.id}/composicao`, label: "Editar composicao", variant: "secondary" as const },
                { href: `/admin/producao?productId=${product.id}`, label: "Produzir item", variant: "secondary" as const },
              ]
            : []),
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o item.">
          {errorMessage}
        </Alert>
      ) : null}

      {product ? (
        <ProductForm
          mode="edit"
          productId={product.id}
          initialState={{
            categoryId: product.categoryId ?? "",
            name: product.name,
            sku: product.sku ?? "",
            barcode: product.barcode ?? "",
            type: product.type,
            unit: product.unit,
            controlsStock: product.controlsStock,
            showOnWebsite: product.showOnWebsite,
            desiredMargin:
              product.desiredMargin !== null && product.desiredMargin !== undefined
                ? normalizeDecimalInput(String(product.desiredMargin))
                : "",
            costPrice: formatCurrencyInput(product.costPrice),
            salePrice: formatCurrencyInput(product.salePrice),
            minimumStock: String(product.minimumStock),
          }}
          metadata={{
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            isActive: product.isActive,
          }}
          history={product.priceHistories}
        />
      ) : null}
    </main>
  );
}

function formatCurrencyInput(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}
