"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FinancialCategoryForm } from "@/app/(admin)/admin/financeiro/categorias/_components/financial-category-form";

type FinancialCategory = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarCategoriaFinanceiraPage() {
  const params = useParams<{ categoryId: string }>();
  const categoryId = params.categoryId;
  const [category, setCategory] = useState<FinancialCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategory() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/financial/categories/${categoryId}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<FinancialCategory>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar a categoria.");
          return;
        }

        setCategory(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar a categoria.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCategory();

    return () => controller.abort();
  }, [categoryId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>Carregando categoria...</section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 760 }}>
          <p style={eyebrowStyle}>Base financeira</p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar categoria financeira
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Ajuste nomenclatura, natureza e disponibilidade para novos lancamentos.
          </p>
        </div>

        <Link href="/admin/financeiro/categorias" style={secondaryButtonStyle}>
          Voltar para categorias
        </Link>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {category ? (
        <FinancialCategoryForm
          mode="edit"
          categoryId={category.id}
          initialState={{
            name: category.name,
            type: category.type,
            isActive: category.isActive,
          }}
        />
      ) : null}
    </main>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
} as const;

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
  padding: 32,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
  color: "var(--muted)",
  textAlign: "center" as const,
} as const;
