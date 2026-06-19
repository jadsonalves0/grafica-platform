import { EntryForm } from "@/app/(admin)/admin/estoque/entradas/_components/entry-form";
import { PageHeader } from "@/components/admin/ui";

export default function NovaEntradaPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        title="Nova entrada"
        description="Monte o documento de entrada, revise os itens e confirme o estoque somente no momento certo."
        secondaryActions={[
          { href: "/admin/estoque/entradas", label: "Voltar para entradas", variant: "secondary" },
          { href: "/admin/estoque/posicao", label: "Ver estoque", variant: "ghost" },
        ]}
      />

      <EntryForm mode="create" />
    </main>
  );
}
