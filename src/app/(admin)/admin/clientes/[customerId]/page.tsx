"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  Field,
  FormSection,
  LoadingButton,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StickyActionBar,
} from "@/components/admin/ui";
import {
  emptyCustomerFormState,
  formatCustomerField,
  maskCustomerFormState,
  type CustomerFormError,
  type CustomerFormState,
  validateCustomerFormDetailed,
} from "@/lib/forms/customer-form";

type CustomerDetail = CustomerFormState & {
  id: string;
  isActive: boolean;
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

export default function EditarClientePage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params.customerId;

  const [form, setForm] = useState<CustomerFormState>(emptyCustomerFormState);
  const [meta, setMeta] = useState<{
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<CustomerFormError | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof CustomerFormState, FieldElement | null>>>({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomer() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/customers/${customerId}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<CustomerDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(
            result.message ?? "Nao foi possivel carregar o cliente.",
          );
          return;
        }

        setForm(
          maskCustomerFormState({
            name: result.data.name ?? "",
            document: result.data.document ?? "",
            email: result.data.email ?? "",
            phone: result.data.phone ?? "",
            whatsapp: result.data.whatsapp ?? "",
            addressZipCode: result.data.addressZipCode ?? "",
            addressStreet: result.data.addressStreet ?? "",
            addressNumber: result.data.addressNumber ?? "",
            addressDistrict: result.data.addressDistrict ?? "",
            addressCity: result.data.addressCity ?? "",
            addressState: result.data.addressState ?? "",
            notes: result.data.notes ?? "",
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

        setErrorMessage(
          "Nao foi possivel carregar o cliente. Tente novamente.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCustomer();

    return () => controller.abort();
  }, [customerId]);

  useEffect(() => {
    if (!fieldError) {
      return;
    }

    window.requestAnimationFrame(() => {
      errorSummaryRef.current?.focus();
      fieldRefs.current[fieldError.field]?.focus();
    });
  }, [fieldError]);

  const statusLabel = meta.isActive ? "Ativo" : "Inativo";
  const helperText = useMemo(
    () => ({
      notes:
        "Use para registrar observacoes de atendimento, restricoes ou detalhes que ajudem o comercial.",
    }),
    [],
  );

  function updateField(field: keyof CustomerFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: formatCustomerField(field, value),
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
    const validationError = validateCustomerFormDetailed(form);

    if (validationError) {
      setFieldError(validationError);
      setErrorMessage(
        `Nao foi possivel salvar o cliente. Revise o campo "${fieldLabelMap[validationError.field]}". ${validationError.message}`,
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as ApiResult<CustomerDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(
          result.message ??
            "Nao foi possivel atualizar o cliente. Revise os dados e tente novamente.",
        );
        return;
      }

      router.push("/admin/clientes?feedback=updated");
      router.refresh();
    } catch {
      setErrorMessage(
        "Nao foi possivel atualizar o cliente. Tente novamente em instantes.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(nextStatus: boolean) {
    setIsUpdatingStatus(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      const result = (await response.json()) as ApiResult<CustomerDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(
          result.message ??
            "Nao foi possivel atualizar o status do cliente. Tente novamente.",
        );
        return;
      }

      const feedback = nextStatus ? "activated" : "deactivated";
      router.push(`/admin/clientes?feedback=${feedback}`);
      router.refresh();
    } catch {
      setErrorMessage(
        "Nao foi possivel atualizar o status do cliente. Tente novamente.",
      );
    } finally {
      setIsUpdatingStatus(false);
      setDialogState(null);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as ApiResult<{ deleted: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.message ??
            "Nao foi possivel excluir o cliente. Se ele tiver historico, use a inativacao.",
        );
        return;
      }

      router.push("/admin/clientes?feedback=deleted");
      router.refresh();
    } catch {
      setErrorMessage(
        "Nao foi possivel excluir o cliente. Tente novamente em instantes.",
      );
    } finally {
      setIsDeleting(false);
      setDialogState(null);
    }
  }

  if (isLoading) {
    return (
      <main className="admin-page-stack">
        <PageHeader
          title="Editar cliente"
          description="Estamos carregando os dados do cliente para revisao."
          secondaryActions={[
            { href: "/admin/clientes", label: "Voltar para clientes" },
          ]}
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
        title="Editar cliente"
        description="Atualize dados de contato, mantenha o cadastro consistente e siga para o proximo passo comercial sem perder contexto."
        secondaryActions={[
          { href: "/admin/clientes", label: "Voltar para clientes" },
          { href: "/admin/orcamentos/novo", label: "Novo orcamento", variant: "secondary" },
        ]}
      />

      <section className="admin-card-grid">
        <MetricCard
          label="Criado em"
          value={meta.createdAt ? formatDateTime(meta.createdAt) : "-"}
        />
        <MetricCard
          label="Ultima atualizacao"
          value={meta.updatedAt ? formatDateTime(meta.updatedAt) : "-"}
        />
        <MetricCard label="Status do cadastro" value={statusLabel} />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel concluir a operacao.">
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            style={{ display: "grid", gap: 8, outline: "none" }}
          >
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
          title="Dados principais"
          description="Comece pelos campos essenciais do cliente."
        >
          <div className="admin-form-grid admin-form-grid--2">
            <Field
              label="Nome ou razao social"
              required
              error={fieldError?.field === "name" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.name = element;
                }}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="admin-input"
              />
            </Field>

            <Field
              label="CPF ou CNPJ"
              optional
              error={
                fieldError?.field === "document" ? fieldError.message : undefined
              }
            >
              <input
                ref={(element) => {
                  fieldRefs.current.document = element;
                }}
                value={form.document}
                onChange={(event) => updateField("document", event.target.value)}
                className="admin-input"
                inputMode="numeric"
                maxLength={18}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Contato"
          description="Mantenha os canais de resposta e atendimento organizados."
        >
          <div className="admin-form-grid admin-form-grid--2">
            <Field
              label="E-mail"
              optional
              error={fieldError?.field === "email" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.email = element;
                }}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="admin-input"
                autoComplete="email"
              />
            </Field>

            <Field
              label="Telefone"
              optional
              error={fieldError?.field === "phone" ? fieldError.message : undefined}
            >
              <input
                ref={(element) => {
                  fieldRefs.current.phone = element;
                }}
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="admin-input"
                inputMode="tel"
                maxLength={15}
              />
            </Field>

            <Field
              label="WhatsApp"
              optional
              error={
                fieldError?.field === "whatsapp" ? fieldError.message : undefined
              }
            >
              <input
                ref={(element) => {
                  fieldRefs.current.whatsapp = element;
                }}
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                className="admin-input"
                inputMode="tel"
                maxLength={15}
              />
            </Field>
          </div>
        </SectionCard>

        <FormSection
          title="Endereco"
          description="Abra esta secao para revisar ou completar o endereco do cliente."
          defaultOpen={false}
        >
          <div className="admin-form-grid admin-form-grid--2">
            <Field
              label="CEP"
              optional
              error={
                fieldError?.field === "addressZipCode"
                  ? fieldError.message
                  : undefined
              }
            >
              <input
                ref={(element) => {
                  fieldRefs.current.addressZipCode = element;
                }}
                value={form.addressZipCode}
                onChange={(event) =>
                  updateField("addressZipCode", event.target.value)
                }
                className="admin-input"
                inputMode="numeric"
                maxLength={9}
              />
            </Field>

            <Field label="Rua" optional>
              <input
                ref={(element) => {
                  fieldRefs.current.addressStreet = element;
                }}
                value={form.addressStreet}
                onChange={(event) =>
                  updateField("addressStreet", event.target.value)
                }
                className="admin-input"
              />
            </Field>

            <Field label="Numero" optional>
              <input
                ref={(element) => {
                  fieldRefs.current.addressNumber = element;
                }}
                value={form.addressNumber}
                onChange={(event) =>
                  updateField("addressNumber", event.target.value)
                }
                className="admin-input"
              />
            </Field>

            <Field label="Bairro" optional>
              <input
                ref={(element) => {
                  fieldRefs.current.addressDistrict = element;
                }}
                value={form.addressDistrict}
                onChange={(event) =>
                  updateField("addressDistrict", event.target.value)
                }
                className="admin-input"
              />
            </Field>

            <Field label="Cidade" optional>
              <input
                ref={(element) => {
                  fieldRefs.current.addressCity = element;
                }}
                value={form.addressCity}
                onChange={(event) => updateField("addressCity", event.target.value)}
                className="admin-input"
              />
            </Field>

            <Field
              label="UF"
              optional
              error={
                fieldError?.field === "addressState"
                  ? fieldError.message
                  : undefined
              }
            >
              <input
                ref={(element) => {
                  fieldRefs.current.addressState = element;
                }}
                value={form.addressState}
                onChange={(event) => updateField("addressState", event.target.value)}
                className="admin-input"
                maxLength={2}
                placeholder="SP"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Informacoes complementares"
          description="Use esta area para observacoes que ajudem o time comercial e financeiro."
          defaultOpen={false}
        >
          <Field label="Observacoes" optional helpText={helperText.notes}>
            <textarea
              ref={(element) => {
                fieldRefs.current.notes = element;
              }}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="admin-textarea"
              rows={5}
            />
          </Field>
        </FormSection>

        <StickyActionBar>
          <div className="admin-row">
            <button
              type="button"
              className={`admin-button admin-button--${
                meta.isActive ? "secondary" : "ghost"
              }`}
              disabled={isDeleting || isSubmitting || isUpdatingStatus}
              onClick={() =>
                setDialogState(meta.isActive ? "deactivate" : "activate")
              }
            >
              {meta.isActive ? "Inativar cadastro" : "Reativar cadastro"}
            </button>
            <button
              type="button"
              className="admin-button admin-button--danger"
              disabled={isDeleting || isSubmitting || isUpdatingStatus}
              onClick={() => setDialogState("delete")}
            >
              Excluir cliente
            </button>
          </div>
          <div className="admin-row">
            <Link href="/admin/clientes" className="admin-button admin-button--secondary">
              Cancelar
            </Link>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingLabel="Salvando..."
            >
              Salvar e voltar para clientes
            </LoadingButton>
          </div>
        </StickyActionBar>
      </form>

      <ConfirmDialog
        isOpen={dialogState === "delete"}
        title="Excluir cliente?"
        description="Se este cliente tiver historico em orcamentos, pedidos ou financeiro, a exclusao podera ser bloqueada e a alternativa correta sera a inativacao."
        confirmLabel={isDeleting ? "Excluindo..." : "Excluir cliente"}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDialogState(null)}
        danger
      />

      <ConfirmDialog
        isOpen={dialogState === "deactivate"}
        title="Inativar cliente?"
        description="O cliente deixara de aparecer nas novas operacoes, mas seu historico sera preservado."
        confirmLabel={isUpdatingStatus ? "Inativando..." : "Inativar cadastro"}
        onConfirm={() => void handleStatusChange(false)}
        onCancel={() => setDialogState(null)}
      />

      <ConfirmDialog
        isOpen={dialogState === "activate"}
        title="Reativar cliente?"
        description="O cliente voltara a ficar disponivel para novas propostas, pedidos e vendas."
        confirmLabel={isUpdatingStatus ? "Reativando..." : "Reativar cadastro"}
        onConfirm={() => void handleStatusChange(true)}
        onCancel={() => setDialogState(null)}
      />
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const fieldLabelMap: Record<keyof CustomerFormState, string> = {
  name: "Nome ou razao social",
  document: "CPF ou CNPJ",
  email: "E-mail",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  addressZipCode: "CEP",
  addressStreet: "Rua",
  addressNumber: "Numero",
  addressDistrict: "Bairro",
  addressCity: "Cidade",
  addressState: "UF",
  notes: "Observacoes",
};
