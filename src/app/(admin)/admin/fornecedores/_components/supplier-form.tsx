"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  Field,
  LoadingButton,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StickyActionBar,
} from "@/components/admin/ui";
import {
  emptySupplierFormState,
  formatSupplierField,
  maskSupplierFormState,
  type SupplierFormError,
  type SupplierFormState,
  validateSupplierFormDetailed,
} from "@/lib/forms/supplier-form";

type SupplierDetail = SupplierFormState & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type DialogState = "delete" | "activate" | "deactivate" | null;
type FieldElement = HTMLInputElement | HTMLTextAreaElement;

export function SupplierFormView({ mode }: Readonly<{ mode: "create" | "edit" }>) {
  const params = useParams<{ supplierId: string }>();
  const router = useRouter();
  const supplierId = params?.supplierId;

  const [form, setForm] = useState<SupplierFormState>(emptySupplierFormState);
  const [meta, setMeta] = useState<{
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<SupplierFormError | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof SupplierFormState, FieldElement | null>>>({});

  useEffect(() => {
    if (mode !== "edit" || !supplierId) {
      return;
    }

    const controller = new AbortController();

    async function loadSupplier() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/suppliers/${supplierId}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<SupplierDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o fornecedor.");
          return;
        }

        setForm(
          maskSupplierFormState({
            legalName: result.data.legalName ?? "",
            tradeName: result.data.tradeName ?? "",
            document: result.data.document ?? "",
            email: result.data.email ?? "",
            phone: result.data.phone ?? "",
            whatsapp: result.data.whatsapp ?? "",
            contactName: result.data.contactName ?? "",
            addressZipCode: result.data.addressZipCode ?? "",
            addressStreet: result.data.addressStreet ?? "",
            addressNumber: result.data.addressNumber ?? "",
            addressDistrict: result.data.addressDistrict ?? "",
            addressCity: result.data.addressCity ?? "",
            addressState: result.data.addressState ?? "",
            notes: result.data.notes ?? "",
            isActive: result.data.isActive,
          }),
        );
        setMeta({
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          isActive: result.data.isActive,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Nao foi possivel carregar o fornecedor. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSupplier();

    return () => controller.abort();
  }, [mode, supplierId]);

  useEffect(() => {
    if (!fieldError) {
      return;
    }

    window.requestAnimationFrame(() => {
      errorSummaryRef.current?.focus();
      fieldRefs.current[fieldError.field]?.focus();
    });
  }, [fieldError]);

  const statusLabel = meta.isActive ?? form.isActive ? "Ativo" : "Inativo";

  const helperText = useMemo(
    () => ({
      legalName: "Use a razao social para garantir consistencia fiscal e conciliacao por XML.",
      tradeName: "Quando houver nome fantasia, ele sera priorizado na exibicao das buscas operacionais.",
      notes: "Use para registrar prazos, observacoes de compra, canais preferidos ou restricoes operacionais.",
    }),
    [],
  );

  function updateField(field: keyof SupplierFormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: formatSupplierField(field, value) as never,
    }));

    if (fieldError?.field === field) {
      setFieldError(null);
    }

    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateSupplierFormDetailed(form);

    if (validationError) {
      setFieldError(validationError);
      setErrorMessage(
        `Nao foi possivel salvar o fornecedor. Revise o campo "${fieldLabelMap[validationError.field]}". ${validationError.message}`,
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldError(null);

    try {
      const endpoint = mode === "create" ? "/api/suppliers" : `/api/suppliers/${supplierId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as ApiResult<SupplierDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(
          result.message ??
            `Nao foi possivel ${mode === "create" ? "salvar" : "atualizar"} o fornecedor.`,
        );
        return;
      }

      router.push(
        `/admin/fornecedores?feedback=${mode === "create" ? "created" : "updated"}`,
      );
      router.refresh();
    } catch {
      setErrorMessage(
        `Nao foi possivel ${mode === "create" ? "salvar" : "atualizar"} o fornecedor. Tente novamente em instantes.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(nextStatus: boolean) {
    if (!supplierId) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const result = (await response.json()) as ApiResult<SupplierDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o status do fornecedor.");
        return;
      }

      router.push(`/admin/fornecedores?feedback=${nextStatus ? "activated" : "deactivated"}`);
      router.refresh();
    } catch {
      setErrorMessage("Nao foi possivel atualizar o status do fornecedor. Tente novamente.");
    } finally {
      setIsUpdatingStatus(false);
      setDialogState(null);
    }
  }

  async function handleDelete() {
    if (!supplierId) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as ApiResult<{ deleted: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.message ?? "Nao foi possivel excluir o fornecedor. Se houver historico, use a inativacao.",
        );
        return;
      }

      router.push("/admin/fornecedores?feedback=deleted");
      router.refresh();
    } catch {
      setErrorMessage("Nao foi possivel excluir o fornecedor. Tente novamente em instantes.");
    } finally {
      setIsDeleting(false);
      setDialogState(null);
    }
  }

  if (isLoading) {
    return (
      <main className="admin-page-stack">
        <PageHeader
          title="Editar fornecedor"
          description="Estamos carregando os dados do fornecedor para revisao."
          secondaryActions={[{ href: "/admin/fornecedores", label: "Voltar para fornecedores" }]}
        />
        <SectionCard title="Carregando cadastro">
          <Skeleton lines={8} />
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        title={mode === "create" ? "Novo fornecedor" : "Editar fornecedor"}
        description="Centralize dados de compra, XML e relacionamento com itens em um unico cadastro operacional."
        secondaryActions={[
          { href: "/admin/fornecedores", label: "Voltar para fornecedores" },
          { href: "/admin/estoque/entradas/novo", label: "Nova entrada", variant: "secondary" },
        ]}
      />

      {mode === "edit" ? (
        <section className="admin-card-grid">
          <MetricCard label="Criado em" value={meta.createdAt ? formatDateTime(meta.createdAt) : "-"} />
          <MetricCard label="Ultima atualizacao" value={meta.updatedAt ? formatDateTime(meta.updatedAt) : "-"} />
          <MetricCard label="Status do cadastro" value={statusLabel} />
        </section>
      ) : null}

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel concluir a operacao.">
          <div ref={errorSummaryRef} tabIndex={-1} style={{ display: "grid", gap: 8, outline: "none" }}>
            <span>{errorMessage}</span>
            {fieldError ? (
              <button
                type="button"
                className="admin-link-button"
                onClick={() => fieldRefs.current[fieldError.field]?.focus()}
              >
                Ir para {fieldLabelMap[fieldError.field]}
              </button>
            ) : null}
          </div>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="admin-page-stack">
        <SectionCard
          title="Informacoes principais"
          description="Os dados principais ajudam na conciliacao de XML, compras recorrentes e busca operacional."
        >
          <div className="admin-form-grid admin-form-grid--2">
            <Field
              label="Razao social"
              required
              helpText={helperText.legalName}
              error={fieldError?.field === "legalName" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.legalName = element;
                }}
                className="admin-input"
                value={form.legalName}
                onChange={(event) => updateField("legalName", event.target.value)}
                autoComplete="organization"
              />
            </Field>

            <Field
              label="Nome fantasia"
              optional
              helpText={helperText.tradeName}
              error={fieldError?.field === "tradeName" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.tradeName = element;
                }}
                className="admin-input"
                value={form.tradeName}
                onChange={(event) => updateField("tradeName", event.target.value)}
                autoComplete="organization-title"
              />
            </Field>

            <Field
              label="CPF ou CNPJ"
              optional
              error={fieldError?.field === "document" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.document = element;
                }}
                className="admin-input"
                value={form.document}
                onChange={(event) => updateField("document", event.target.value)}
                inputMode="numeric"
                maxLength={18}
                placeholder="00.000.000/0000-00"
              />
            </Field>

            <Field
              label="Contato principal"
              optional
              error={fieldError?.field === "contactName" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.contactName = element;
                }}
                className="admin-input"
                value={form.contactName}
                onChange={(event) => updateField("contactName", event.target.value)}
                placeholder="Pessoa de contato"
                autoComplete="name"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Contato"
          description="Preencha os canais que facilitam cotacao, cobranca e retorno rapido com o fornecedor."
        >
          <div className="admin-form-grid admin-form-grid--2">
            <Field label="E-mail" optional error={fieldError?.field === "email" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.email = element;
                }}
                className="admin-input"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                autoComplete="email"
                placeholder="compras@fornecedor.com"
              />
            </Field>

            <Field label="Telefone" optional error={fieldError?.field === "phone" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.phone = element;
                }}
                className="admin-input"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                inputMode="tel"
                maxLength={15}
                placeholder="(11) 3333-4444"
              />
            </Field>

            <Field label="WhatsApp" optional error={fieldError?.field === "whatsapp" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.whatsapp = element;
                }}
                className="admin-input"
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                inputMode="tel"
                maxLength={15}
                placeholder="(11) 99999-0000"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Endereco e observacoes"
          description="Esses dados ajudam quando a operacao depende de coleta, entrega, faturamento ou historico de compra."
        >
          <div className="admin-form-grid admin-form-grid--4">
            <Field label="CEP" optional error={fieldError?.field === "addressZipCode" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.addressZipCode = element;
                }}
                className="admin-input"
                value={form.addressZipCode}
                onChange={(event) => updateField("addressZipCode", event.target.value)}
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
              />
            </Field>

            <Field label="Rua" optional error={fieldError?.field === "addressStreet" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.addressStreet = element;
                }}
                className="admin-input"
                value={form.addressStreet}
                onChange={(event) => updateField("addressStreet", event.target.value)}
              />
            </Field>

            <Field label="Numero" optional error={fieldError?.field === "addressNumber" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.addressNumber = element;
                }}
                className="admin-input"
                value={form.addressNumber}
                onChange={(event) => updateField("addressNumber", event.target.value)}
              />
            </Field>

            <Field label="Bairro" optional error={fieldError?.field === "addressDistrict" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.addressDistrict = element;
                }}
                className="admin-input"
                value={form.addressDistrict}
                onChange={(event) => updateField("addressDistrict", event.target.value)}
              />
            </Field>

            <Field label="Cidade" optional error={fieldError?.field === "addressCity" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.addressCity = element;
                }}
                className="admin-input"
                value={form.addressCity}
                onChange={(event) => updateField("addressCity", event.target.value)}
              />
            </Field>

            <Field label="UF" optional error={fieldError?.field === "addressState" ? fieldError.message : undefined}>
              <input
                ref={(element) => {
                  fieldRefs.current.addressState = element;
                }}
                className="admin-input"
                value={form.addressState}
                onChange={(event) => updateField("addressState", event.target.value)}
                maxLength={2}
                placeholder="SP"
              />
            </Field>
          </div>

          <Field
            label="Observacoes"
            optional
            helpText={helperText.notes}
            error={fieldError?.field === "notes" ? fieldError.message : undefined}
          >
            <textarea
              ref={(element) => {
                fieldRefs.current.notes = element;
              }}
              className="admin-textarea"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Prazo medio, politica de pedido minimo, observacoes de entrega..."
            />
          </Field>
        </SectionCard>

        <StickyActionBar>
          <div className="admin-row" style={{ gap: 12, flexWrap: "wrap" }}>
            {mode === "edit" ? (
              <>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => setDialogState(meta.isActive ? "deactivate" : "activate")}
                  disabled={isUpdatingStatus}
                >
                  {meta.isActive ? "Inativar cadastro" : "Reativar cadastro"}
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  onClick={() => setDialogState("delete")}
                  disabled={isDeleting}
                >
                  Excluir fornecedor
                </button>
              </>
            ) : null}
          </div>

          <LoadingButton
            type="submit"
            className="admin-button admin-button--primary"
            isLoading={isSubmitting}
            loadingLabel={mode === "create" ? "Salvando..." : "Atualizando..."}
          >
            {mode === "create" ? "Salvar fornecedor" : "Atualizar fornecedor"}
          </LoadingButton>
        </StickyActionBar>
      </form>

      <ConfirmDialog
        isOpen={dialogState === "delete"}
        title="Excluir fornecedor"
        description="Essa acao so deve ser usada quando o fornecedor nao tiver historico operacional. Caso contrario, prefira inativar."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onCancel={() => setDialogState(null)}
        onConfirm={handleDelete}
        danger
      />

      <ConfirmDialog
        isOpen={dialogState === "deactivate"}
        title="Inativar fornecedor"
        description="O cadastro fica fora das buscas operacionais novas, mas o historico continua preservado."
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        onCancel={() => setDialogState(null)}
        onConfirm={() => handleStatusChange(false)}
      />

      <ConfirmDialog
        isOpen={dialogState === "activate"}
        title="Reativar fornecedor"
        description="O fornecedor volta a aparecer nas buscas e pode ser usado nas proximas entradas e compras."
        confirmLabel="Reativar"
        cancelLabel="Cancelar"
        onCancel={() => setDialogState(null)}
        onConfirm={() => handleStatusChange(true)}
      />
    </main>
  );
}

const fieldLabelMap: Record<keyof SupplierFormState, string> = {
  legalName: "Razao social",
  tradeName: "Nome fantasia",
  document: "CPF ou CNPJ",
  email: "E-mail",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  contactName: "Contato principal",
  addressZipCode: "CEP",
  addressStreet: "Rua",
  addressNumber: "Numero",
  addressDistrict: "Bairro",
  addressCity: "Cidade",
  addressState: "UF",
  notes: "Observacoes",
  isActive: "Status",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
