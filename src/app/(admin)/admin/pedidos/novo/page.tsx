"use client";

import { OrderForm } from "@/app/(admin)/admin/pedidos/_components/order-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovoPedidoPage() {
  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Novo pedido"
        description="Crie o pedido manualmente ou reaproveite um orcamento aprovado sem perder o contexto do atendimento."
        secondaryActions={[
          { href: "/admin/pedidos", label: "Voltar para pedidos" },
        ]}
      />

      <OrderForm mode="create" />
    </main>
  );
}
