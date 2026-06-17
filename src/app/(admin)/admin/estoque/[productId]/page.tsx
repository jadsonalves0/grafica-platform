"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductForm } from "@/app/(admin)/admin/estoque/_components/product-form";

type ProductDetail = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
  unit: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
  currentStock: number;
  createdAt: string;
  updatedAt: string;
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

    loadProduct();

    return () => controller.abort();
  }, [productId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando item...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos trazendo os dados do catalogo.</span>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 820 }}>
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
            Catalogo de itens
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar item
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Atualize os dados do item para manter orcamentos, pedidos e movimentacoes coerentes.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/estoque" style={secondaryButtonStyle}>
            Voltar para estoque
          </Link>
          <Link
            href={product ? `/admin/estoque/movimentar?productId=${product.id}` : "/admin/estoque/movimentar"}
            style={ghostButtonStyle}
          >
            Movimentar estoque
          </Link>
          {product?.type === "FINISHED_PRODUCT" ? (
            <>
              <Link href={`/admin/estoque/${product.id}/composicao`} style={ghostButtonStyle}>
                Editar composicao
              </Link>
              <Link href={`/admin/producao?productId=${product.id}`} style={ghostButtonStyle}>
                Produzir item
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {product ? (
        <ProductForm
          mode="edit"
          productId={product.id}
          initialState={{
            name: product.name,
            sku: product.sku ?? "",
            barcode: product.barcode ?? "",
            type: product.type,
            unit: product.unit,
            costPrice: formatCurrencyInput(product.costPrice),
            salePrice: formatCurrencyInput(product.salePrice),
            minimumStock: String(product.minimumStock),
          }}
          metadata={{
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          }}
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
