"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  EntryForm,
  type EntryDetail,
} from "@/app/(admin)/admin/estoque/entradas/_components/entry-form";
import { Alert, EmptyState, PageHeader, SectionCard, Skeleton } from "@/components/admin/ui";

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarEntradaPage() {
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEntry() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/inventory/entries/${entryId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<EntryDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar a entrada.");
          return;
        }

        setEntry(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar a entrada.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadEntry();

    return () => controller.abort();
  }, [entryId]);

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        title={entry ? `Entrada ${entry.documentNumber}` : "Detalhes da entrada"}
        description="Revise o documento, os itens e as decisoes sugeridas antes de confirmar ou cancelar a entrada."
        secondaryActions={[
          { href: "/admin/estoque/entradas", label: "Voltar para entradas", variant: "secondary" },
          { href: "/admin/estoque/posicao", label: "Ver estoque", variant: "ghost" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel abrir a entrada">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Carregando entrada">
          <Skeleton lines={6} />
        </SectionCard>
      ) : entry ? (
        <EntryForm mode="edit" entryId={entryId} initialData={entry} />
      ) : (
        <EmptyState
          title="Entrada nao encontrada"
          description="Volte para a lista e tente abrir o documento novamente."
          action={{ href: "/admin/estoque/entradas", label: "Ir para entradas" }}
        />
      )}
    </main>
  );
}
