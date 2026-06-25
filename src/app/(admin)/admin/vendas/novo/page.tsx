"use client";

import { useSearchParams } from "next/navigation";

import { SaleForm } from "@/app/(admin)/admin/vendas/_components/sale-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovaVendaPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        title="Vendas"
        description="Selecione cliente, monte o carrinho e conclua o faturamento da operacao em um unico fluxo."
        secondaryActions={[{ href: "/admin/vendas", label: "Voltar para vendas", variant: "secondary" }]}
      />

      <SaleForm mode="create" prefillOrderId={orderId} />
    </main>
  );
}
