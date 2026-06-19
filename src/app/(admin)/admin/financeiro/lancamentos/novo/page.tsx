"use client";

import { EntryForm } from "@/app/(admin)/admin/financeiro/_components/entry-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovoLancamentoFinanceiroPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--medium">
      <PageHeader
        title="Lancamento manual"
        description="Use esta tela apenas quando a operacao nao nascer de uma venda ou de uma entrada. Os fluxos automaticos continuam sendo o caminho principal."
        secondaryActions={[{ href: "/admin/financeiro", label: "Voltar para financeiro", variant: "secondary" }]}
      />

      <EntryForm mode="create" />
    </main>
  );
}
