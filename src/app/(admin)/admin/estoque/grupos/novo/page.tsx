"use client";

import { ItemGroupForm } from "@/app/(admin)/admin/estoque/grupos/_components/item-group-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovoGrupoItensPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Grupos de itens" }, { label: "Novo grupo" }]}
        title="Novo grupo de itens"
        description="Organize os itens por familia comercial e defina comportamento padrao para website e margem."
        secondaryActions={[{ href: "/admin/estoque/grupos", label: "Voltar para grupos", variant: "secondary" }]}
      />

      <ItemGroupForm mode="create" />
    </main>
  );
}
