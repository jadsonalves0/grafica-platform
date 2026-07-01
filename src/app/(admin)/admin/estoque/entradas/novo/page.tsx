import { EntryForm } from "@/app/(admin)/admin/estoque/entradas/_components/entry-form";
import { EntryXmlImportPanel } from "@/app/(admin)/admin/estoque/entradas/_components/entry-xml-import-panel";
import { PageHeader } from "@/components/admin/ui";

export default function NovaEntradaPage() {
  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        title="Nova entrada"
        description="Escolha entre montar a entrada manualmente ou importar o XML da NF-e para começar por uma pre-entrada revisavel."
        secondaryActions={[
          { href: "/admin/estoque/entradas", label: "Voltar para entradas", variant: "secondary" },
          { href: "/admin/estoque/posicao", label: "Ver estoque", variant: "ghost" },
        ]}
      />

      <div id="importar-xml">
        <EntryXmlImportPanel />
      </div>
      <EntryForm mode="create" />
    </main>
  );
}
