"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FinancialCategoryForm } from "@/app/(admin)/admin/financeiro/categorias/_components/financial-category-form";
import { Alert, PageHeader, SectionCard, Skeleton } from "@/components/admin/ui";

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

    void loadCategory();

    return () => controller.abort();
  }, [categoryId]);

  if (isLoading) {
    return (
      <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
        <PageHeader
          breadcrumbs={[{ label: "Cadastros" }, { label: "Categorias financeiras" }, { label: "Editar categoria" }]}
          title="Editar categoria financeira"
          description="Estamos carregando a categoria para revisao."
          secondaryActions={[{ href: "/admin/financeiro/categorias", label: "Voltar para categorias", variant: "secondary" }]}
        />
        <SectionCard title="Carregando categoria">
          <Skeleton lines={6} />
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Categorias financeiras" }, { label: "Editar categoria" }]}
        title="Editar categoria financeira"
        description="Ajuste nomenclatura, natureza e disponibilidade para novos lancamentos."
        secondaryActions={[{ href: "/admin/financeiro/categorias", label: "Voltar para categorias", variant: "secondary" }]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar a categoria.">
          {errorMessage}
        </Alert>
      ) : null}

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
