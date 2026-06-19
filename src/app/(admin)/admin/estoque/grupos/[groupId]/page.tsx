"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ItemGroupForm } from "@/app/(admin)/admin/estoque/grupos/_components/item-group-form";
import { Alert, PageHeader, SectionCard, Skeleton } from "@/components/admin/ui";
import { normalizeDecimalInput } from "@/lib/forms/br-utils";

type ItemGroupDetail = {
  id: string;
  name: string;
  description?: string | null;
  defaultMargin?: number | null;
  showOnWebsite: boolean;
  isActive: boolean;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarGrupoItensPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;

  const [group, setGroup] = useState<ItemGroupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroup() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/inventory/groups/${groupId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<ItemGroupDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o grupo.");
          return;
        }

        setGroup(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar o grupo.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadGroup();

    return () => controller.abort();
  }, [groupId]);

  if (isLoading) {
    return (
      <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
        <PageHeader
          breadcrumbs={[{ label: "Cadastros" }, { label: "Grupos de itens" }, { label: "Editar grupo" }]}
          title="Editar grupo de itens"
          description="Estamos carregando os dados do grupo para revisao."
          secondaryActions={[{ href: "/admin/estoque/grupos", label: "Voltar para grupos", variant: "secondary" }]}
        />
        <SectionCard title="Carregando grupo">
          <Skeleton lines={6} />
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--narrow">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Grupos de itens" }, { label: "Editar grupo" }]}
        title="Editar grupo de itens"
        description="Ajuste nome, margem padrao e comportamento de publicacao do grupo."
        secondaryActions={[{ href: "/admin/estoque/grupos", label: "Voltar para grupos", variant: "secondary" }]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o grupo.">
          {errorMessage}
        </Alert>
      ) : null}

      {group ? (
        <ItemGroupForm
          mode="edit"
          groupId={group.id}
          initialState={{
            name: group.name,
            description: group.description ?? "",
            defaultMargin:
              group.defaultMargin !== null && group.defaultMargin !== undefined
                ? normalizeDecimalInput(String(group.defaultMargin))
                : "",
            showOnWebsite: group.showOnWebsite,
            isActive: group.isActive,
          }}
        />
      ) : null}
    </main>
  );
}
