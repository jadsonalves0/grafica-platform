"use client";

import { ProductForm } from "@/app/(admin)/admin/estoque/_components/product-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovoItemEstoquePage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Itens" }, { label: "Novo item" }]}
        title="Novo item"
        description="Cadastre produtos, servicos e materias-primas que alimentam orcamentos, pedidos e movimentacoes."
        secondaryActions={[
          { href: "/admin/estoque", label: "Voltar para itens", variant: "secondary" },
          { href: "/admin/estoque/grupos", label: "Ver grupos", variant: "secondary" },
        ]}
      />

      <ProductForm mode="create" />
    </main>
  );
}
