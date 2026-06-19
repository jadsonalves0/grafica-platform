"use client";

import { SaleForm } from "@/app/(admin)/admin/vendas/_components/sale-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovaVendaPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        title="Nova venda"
        description="Monte a venda em um fluxo proprio, com itens, descontos e total sempre visiveis."
        secondaryActions={[{ href: "/admin/vendas", label: "Voltar para vendas", variant: "secondary" }]}
      />

      <SaleForm mode="create" />
    </main>
  );
}
