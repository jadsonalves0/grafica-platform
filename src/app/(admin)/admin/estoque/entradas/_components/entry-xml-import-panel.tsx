"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  LoadingButton,
  SectionCard,
} from "@/components/admin/ui";

type ImportResult = {
  success: boolean;
  message?: string;
  data?: {
    draftEntryId: string;
    document: {
      number: string;
      supplierName?: string | null;
    };
    items: Array<{
      matchStatus: string;
    }>;
  };
};

export function EntryXmlImportPanel() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleImport() {
    if (!selectedFile) {
      setErrorMessage("Selecione um XML de NF-e para iniciar a pre-entrada.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/inventory/entries/import-xml", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ImportResult;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel importar o XML informado.");
        return;
      }

      router.push(`/admin/estoque/entradas/${result.data.draftEntryId}`);
      router.refresh();
    } catch {
      setErrorMessage("Falha ao importar o XML da nota fiscal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionCard
      title="Importar XML da NF-e"
      description="Crie uma pre-entrada revisavel. O sistema identifica itens, sugere conciliacao e so atualiza o estoque depois da sua confirmacao."
      actions={
        <LoadingButton
          type="button"
          isLoading={isSubmitting}
          loadingLabel="Importando XML..."
          onClick={handleImport}
          disabled={!selectedFile}
        >
          Importar XML
        </LoadingButton>
      }
    >
      <div className="admin-page-stack">
        {errorMessage ? (
          <Alert variant="danger" title="Nao foi possivel importar o XML">
            {errorMessage}
          </Alert>
        ) : null}

        <div className="admin-form-grid admin-form-grid--2">
          <label className="admin-field">
            <span className="admin-field__label">Arquivo XML da NF-e</span>
            <input
              className="admin-input"
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <span className="admin-field__help">
              Use o XML oficial da nota. O rascunho criado preserva o documento original como anexo operacional.
            </span>
          </label>

          <div className="admin-surface-muted">
            <strong>O que acontece apos importar</strong>
            <div className="admin-inline-stack" style={{ marginTop: 10 }}>
              <span>1. O documento vira rascunho de entrada.</span>
              <span>2. Cada item recebe sugestao de conciliacao.</span>
              <span>3. O estoque e o financeiro so sao gerados na confirmacao.</span>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
