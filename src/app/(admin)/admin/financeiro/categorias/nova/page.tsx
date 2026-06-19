"use client";

import { FinancialCategoryForm } from "@/app/(admin)/admin/financeiro/categorias/_components/financial-category-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovaCategoriaFinanceiraPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Categorias financeiras" }, { label: "Nova categoria" }]}
        title="Nova categoria financeira"
        description="Cadastre categorias de receita e despesa para padronizar os lancamentos."
        secondaryActions={[{ href: "/admin/financeiro/categorias", label: "Voltar para categorias", variant: "secondary" }]}
      />

      <FinancialCategoryForm mode="create" />
    </main>
  );
}
