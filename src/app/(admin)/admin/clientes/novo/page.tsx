"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Field,
  FormSection,
  LoadingButton,
  PageHeader,
  SectionCard,
  StickyActionBar,
} from "@/components/admin/ui";
import {
  emptyCustomerFormState,
  formatCustomerField,
  type CustomerFormError,
  type CustomerFormState,
  validateCustomerFormDetailed,
} from "@/lib/forms/customer-form";

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<CustomerFormError | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof CustomerFormState, FieldElement | null>>>({});

  const helperText = useMemo(
    () => ({
      addressStreet: "Preencha quando o cliente utilizar coleta, entrega ou faturamento com endereco.",
      notes: "Use para registrar observacoes importantes do atendimento ou restricoes de cadastro.",
    }),
    [],
  );

  useEffect(() => {
    if (!fieldError) {
      return;
    }

    window.requestAnimationFrame(() => {
      errorSummaryRef.current?.focus();
      fieldRefs.current[fieldError.field]?.focus();
    });
  }, [fieldError]);

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
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as ApiResult<{
        id: string;
        name: string;
      }>;

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.message ??
            "Nao foi possivel salvar o cliente. Revise os dados informados e tente novamente.",
        );
        return;
      }

      router.push("/admin/clientes?feedback=created");
      router.refresh();
    } catch {
      setErrorMessage(
        "Nao foi possivel salvar o cliente. Tente novamente em instantes.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Novo cliente"
        description="Cadastre o cliente com o minimo de informacoes necessarias para orcamentos, pedidos, vendas e acompanhamento."
        primaryAction={undefined}
        secondaryActions={[
          { href: "/admin/clientes", label: "Voltar para clientes" },
        ]}
      />

      {errorMessage ? (
        <Alert
          variant="danger"
          title="Nao foi possivel salvar o cliente."
        >
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
          title="Informacoes principais"
          description="Os campos essenciais ficam primeiro para reduzir o tempo de cadastro."
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
                autoComplete="organization"
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
          description="Preencha os canais que ajudam o comercial a responder rapido sem obrigar dados desnecessarios."
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
                placeholder="cliente@empresa.com"
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
                placeholder="(11) 3333-4444"
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
                placeholder="(11) 99999-0000"
              />
            </Field>
          </div>
        </SectionCard>

        <FormSection
          title="Endereco"
          description="Expanda esta secao quando o cadastro precisar de endereco completo."
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
                placeholder="00000-000"
              />
            </Field>

            <Field
              label="Rua"
              optional
              helpText={helperText.addressStreet}
            >
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
          description="Use quando houver observacoes importantes para o atendimento."
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
            <Link href="/admin/clientes" className="admin-button admin-button--secondary">
              Cancelar
            </Link>
          </div>
          <div className="admin-row">
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingLabel="Salvando..."
            >
              Salvar cliente
            </LoadingButton>
          </div>
        </StickyActionBar>
      </form>
    </main>
  );
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
