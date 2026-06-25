"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  Field,
  FormSection,
  LoadingButton,
  SectionCard,
  StatusBadge,
  StickyActionBar,
} from "@/components/admin/ui";
import { QuickCustomerPanel } from "@/components/forms/quick-customer-panel";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import { MoneyInput, QuantityInput } from "@/components/forms/number-inputs";
import {
  formatCurrencyInput,
  formatCurrencyValue,
  normalizeDecimalInput,
  parseCurrencyInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";

type CustomerOption = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: string;
  currentStock: number;
  salePrice: number;
  isActive: boolean;
};

type QuoteItemForm = {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type QuoteFormState = {
  customerId: string;
  validUntil: string;
  discountAmount: string;
  notes: string;
  items: QuoteItemForm[];
};

type QuoteDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    customerId: string;
    customerName: string;
    validUntil?: string | null;
    discountAmount: number;
    notes?: string | null;
    status: string;
    code: string;
    items: Array<{
      id: string;
      productId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
};

type SaveResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    code: string;
    status: string;
  };
};

type QuoteFormProps = {
  mode: "create" | "edit";
  customers: CustomerOption[];
  products: ProductOption[];
  initialData?: QuoteDetailResponse["data"];
  quoteId?: string;
};

function createEmptyItem(): QuoteItemForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "0,00",
  };
}

function buildInitialState(initialData?: QuoteDetailResponse["data"]): QuoteFormState {
  if (!initialData) {
    return {
      customerId: "",
      validUntil: "",
      discountAmount: formatCurrencyInput(0),
      notes: "",
      items: [createEmptyItem()],
    };
  }

  return {
    customerId: initialData.customerId,
    validUntil: initialData.validUntil ? initialData.validUntil.slice(0, 10) : "",
    discountAmount: formatCurrencyInput(initialData.discountAmount ?? 0),
    notes: initialData.notes ?? "",
    items: initialData.items.length
      ? initialData.items.map((item) => ({
          id: item.id,
          productId: item.productId ?? "",
          description: item.description,
          quantity: normalizeDecimalInput(String(item.quantity)),
          unitPrice: formatCurrencyValue(item.unitPrice),
        }))
      : [createEmptyItem()],
  };
}

export function QuoteForm({ mode, customers, products, initialData, quoteId }: Readonly<QuoteFormProps>) {
  const router = useRouter();
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(customers);
  const [form, setForm] = useState<QuoteFormState>(() => buildInitialState(initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      errorSummaryRef.current?.focus();
    }
  }, [errorMessage]);

  const pricing = useMemo(() => {
    const items = form.items.map((item) => {
      const rawQuantity = item.quantity;
      const rawUnitPrice = item.unitPrice;
      const quantity = parseDecimalInput(item.quantity);
      const unitPrice = parseCurrencyInput(item.unitPrice);
      const total = roundCurrency(quantity * unitPrice);

      return {
        ...item,
        rawQuantity,
        rawUnitPrice,
        quantity,
        unitPrice,
        total,
      };
    });

    const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.total, 0));
    const discountAmount = roundCurrency(parseCurrencyInput(form.discountAmount));
    const totalAmount = roundCurrency(Math.max(subtotal - discountAmount, 0));

    return {
      items,
      subtotal,
      discountAmount,
      totalAmount,
    };
  }, [form]);

  const customerLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customerOptions.map((customer) => ({
        value: customer.id,
        label: customer.name,
        description: [customer.email, customer.whatsapp].filter(Boolean).join(" | ") || undefined,
        keywords: [customer.email ?? "", customer.whatsapp ?? ""],
      })),
    [customerOptions],
  );

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.isActive || form.items.some((item) => item.productId === product.id),
      ),
    [form.items, products],
  );

  const productLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      availableProducts.map((product) => ({
        value: product.id,
        label: product.name,
        description: [
          product.sku ? `SKU ${product.sku}` : "Sem SKU",
          product.barcode ? `EAN ${product.barcode}` : "Sem EAN",
          `${formatType(product.type)} | ${product.unit}`,
          `Saldo ${formatNumber(product.currentStock)}`,
          `Venda sugerida ${formatCurrency(product.salePrice)}`,
        ].join(" | "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit, formatType(product.type)],
      })),
    [availableProducts],
  );

  function updateField(field: keyof Omit<QuoteFormState, "items">, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(itemId: string, field: keyof QuoteItemForm, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  }

  function handleProductSelection(itemId: string, productId: string) {
    const selectedProduct = availableProducts.find((product) => product.id === productId);

    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId,
              description: selectedProduct ? selectedProduct.name : item.description,
              unitPrice: selectedProduct ? formatCurrencyValue(selectedProduct.salePrice) : item.unitPrice,
            }
          : item,
      ),
    }));
  }

  function handleCustomerCreated(customer: {
    id: string;
    name: string;
    email?: string | null;
    whatsapp?: string | null;
  }) {
    setCustomerOptions((current) =>
      [...current, customer].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    );
    updateField("customerId", customer.id);
    setShowQuickCustomer(false);
    setSuccessMessage("Cliente cadastrado e selecionado no orcamento.");
    setErrorMessage(null);
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()],
    }));
  }

  function removeItem(itemId: string) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== itemId),
    }));
  }

  function validateForm() {
    if (mode === "create" && !form.customerId) {
      return "Nao foi possivel salvar o orcamento. Selecione o cliente da proposta antes de continuar.";
    }

    if (parseCurrencyInput(form.discountAmount) < 0) {
      return "Nao foi possivel salvar o orcamento. O desconto informado esta invalido. Informe um valor igual ou maior que zero.";
    }

    for (const [index, item] of form.items.entries()) {
      if (item.description.trim().length < 2) {
        return `Nao foi possivel salvar o orcamento. Revise a descricao do item ${index + 1} e informe pelo menos 2 caracteres.`;
      }

      if (parseDecimalInput(item.quantity) <= 0) {
        return `Nao foi possivel salvar o orcamento. Revise a quantidade do item ${index + 1} e informe um valor maior que zero.`;
      }

      if (parseCurrencyInput(item.unitPrice) < 0) {
        return `Nao foi possivel salvar o orcamento. Revise o valor unitario do item ${index + 1} e informe um valor valido.`;
      }
    }

    if (parseCurrencyInput(form.discountAmount) > pricing.subtotal) {
      return "Nao foi possivel salvar o orcamento. O desconto total nao pode ser maior que o subtotal da proposta.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        ...(mode === "create" ? { customerId: form.customerId } : {}),
        validUntil: form.validUntil || undefined,
        discountAmount: parseCurrencyInput(form.discountAmount),
        notes: form.notes.trim(),
        items: form.items.map((item) => ({
          productId: item.productId || undefined,
          description: item.description.trim(),
          quantity: parseDecimalInput(item.quantity),
          unitPrice: parseCurrencyInput(item.unitPrice),
        })),
      };

      const response = await fetch(mode === "create" ? "/api/quotes" : `/api/quotes/${quoteId}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o orcamento. Revise os dados e tente novamente.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? `Orcamento ${result.data.code} criado com sucesso.`
          : `Orcamento ${result.data.code} atualizado com sucesso.`,
      );

      window.setTimeout(() => {
        router.push(mode === "create" ? `/admin/orcamentos/${result.data!.id}` : "/admin/orcamentos?feedback=updated");
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Nao foi possivel salvar o orcamento. Tente novamente. Se o problema continuar, recarregue a pagina.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!quoteId) {
      return;
    }

    setIsApproving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}/approve`, {
        method: "POST",
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel aprovar o orcamento. Revise o status atual e tente novamente.");
        return;
      }

      setSuccessMessage(`Orcamento ${result.data.code} aprovado com sucesso.`);
      window.setTimeout(() => {
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Nao foi possivel aprovar o orcamento. Tente novamente.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleDelete() {
    if (!quoteId) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel excluir o orcamento. Tente novamente.");
        return;
      }

      router.push("/admin/orcamentos?feedback=deleted");
      router.refresh();
    } catch {
      setErrorMessage("Nao foi possivel excluir o orcamento. Tente novamente.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="admin-page-stack">
        {errorMessage ? (
          <div ref={errorSummaryRef} tabIndex={-1}>
            <Alert variant="danger" title="Nao foi possivel continuar com o orcamento.">
              {errorMessage}
            </Alert>
          </div>
        ) : null}

        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <SectionCard
          title="Informacoes principais"
          description="Defina o cliente, a validade e o desconto geral antes de revisar os itens."
        >
          <div className="admin-form-grid admin-form-grid--3">
            <Field label="Cliente" required={mode === "create"} helpText={mode === "edit" ? "Cliente original da proposta." : undefined}>
              {mode === "edit" ? (
                <input value={initialData?.customerName ?? ""} disabled className="admin-input" />
              ) : (
                <SearchableSelect
                  value={form.customerId}
                  options={customerLookupOptions}
                  onChange={(value) => updateField("customerId", value)}
                  placeholder="Pesquisar cliente por nome, e-mail ou WhatsApp"
                  emptyMessage="Nenhum cliente encontrado para esta busca."
                />
              )}
            </Field>

            <Field label="Valido ate" optional helpText="Use quando a proposta tiver prazo de resposta.">
              <input
                type="date"
                value={form.validUntil}
                onChange={(event) => updateField("validUntil", event.target.value)}
                className="admin-input"
              />
            </Field>

            <Field label="Desconto total (R$)" optional helpText="Aplicado ao total do orcamento, sem alterar o preco historico dos itens.">
              <MoneyInput
                value={form.discountAmount}
                onChange={(value) => updateField("discountAmount", value)}
                placeholder="0,00"
                className="admin-input"
              />
            </Field>
          </div>

          {mode === "create" ? (
            <FormSection
              title="Cliente nao encontrado"
              description="Cadastre o cliente sem sair da proposta e continue do ponto em que voce parou."
              defaultOpen={showQuickCustomer}
            >
              <div className="admin-inline-stack">
                <div className="admin-row admin-row--between">
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    Se o cliente ainda nao estiver na base, use o cadastro rapido abaixo.
                  </span>
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => setShowQuickCustomer((current) => !current)}
                  >
                    {showQuickCustomer ? "Ocultar cadastro rapido" : "Cadastrar cliente rapido"}
                  </button>
                </div>
                {showQuickCustomer ? (
                  <QuickCustomerPanel
                    onCreated={handleCustomerCreated}
                    onCancel={() => setShowQuickCustomer(false)}
                  />
                ) : null}
              </div>
            </FormSection>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Itens do orcamento"
          description="Pesquise itens do catalogo para ganhar velocidade ou descreva um servico sob medida quando precisar."
          actions={
            <div className="admin-row">
              <Link href="/admin/estoque/novo" className="admin-button admin-button--secondary">
                Cadastrar item
              </Link>
              <button type="button" className="admin-button admin-button--secondary" onClick={addItem}>
                Adicionar item
              </button>
            </div>
          }
        >
          <div className="admin-list-stack">
            {pricing.items.map((item, index) => (
              <article key={item.id} className="admin-list-card">
                <div
                  className="admin-form-grid"
                  style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.3fr) minmax(120px, 0.6fr) minmax(150px, 0.8fr) minmax(140px, 0.8fr)" }}
                >
                  <Field label={`Item cadastrado ${index + 1}`} optional helpText="Procure por nome, SKU ou EAN para preencher mais rapido.">
                    <SearchableSelect
                      value={item.productId}
                      options={productLookupOptions}
                      onChange={(value) => handleProductSelection(item.id, value)}
                      placeholder="Pesquisar por nome, SKU ou EAN"
                      emptyMessage="Nenhum item cadastrado encontrado."
                      clearable
                    />
                  </Field>

                  <Field label={`Descricao do item ${index + 1}`} required>
                    <input
                      value={item.description}
                      onChange={(event) => updateItem(item.id, "description", event.target.value)}
                      className="admin-input"
                    />
                  </Field>

                  <Field label="Quantidade" required>
                    <QuantityInput
                      value={item.rawQuantity || ""}
                      onChange={(value) => updateItem(item.id, "quantity", value)}
                      className="admin-input"
                    />
                  </Field>

                  <Field label="Valor unitario" required>
                    <MoneyInput
                      value={item.rawUnitPrice || ""}
                      onChange={(value) => updateItem(item.id, "unitPrice", value)}
                      className="admin-input"
                    />
                  </Field>

                  <Field label="Total">
                    <div className="admin-readonly-box admin-readonly-box--emphasis">
                      {formatCurrency(item.total)}
                    </div>
                  </Field>
                </div>

                <div className="admin-row admin-row--between">
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    {item.productId
                      ? "Item vinculado ao catalogo. A descricao e o valor ainda podem ser ajustados so nesta proposta."
                      : "Item livre. Use quando a proposta nao depender de um cadastro previo."}
                  </span>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => removeItem(item.id)}
                    disabled={form.items.length === 1}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="admin-layout-grid admin-layout-grid--sidebar">
          <SectionCard
            title="Observacoes"
            description="Use este espaco apenas para complementar a proposta com algo que nao caiba nos itens."
          >
            <Field label="Observacoes da proposta" optional>
              <textarea
                rows={6}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="admin-textarea"
              />
            </Field>
          </SectionCard>

          <SectionCard title="Revisao" description="Confira o total antes de salvar ou aprovar.">
            <div className="admin-summary-list">
              {initialData?.status ? (
                <div className="admin-summary-row">
                  <span style={{ color: "var(--muted)" }}>Status</span>
                  <StatusBadge status={formatStatus(initialData.status)} tone={mapQuoteTone(initialData.status)} />
                </div>
              ) : null}
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Subtotal</span>
                <strong>{formatCurrency(pricing.subtotal)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Desconto</span>
                <strong>{formatCurrency(pricing.discountAmount)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>Total</span>
                <strong style={{ fontSize: 24 }}>{formatCurrency(pricing.totalAmount)}</strong>
              </div>
              <div className="admin-surface-muted">
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  Depois de aprovar, a proposta fica pronta para seguir para pedido.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        <StickyActionBar>
          <div className="admin-row">
            {mode === "edit" ? (
              <>
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting || isSubmitting || isApproving}
                >
                  Excluir
                </button>

                {initialData?.status !== "APPROVED" ? (
                  <LoadingButton
                    type="button"
                    className="admin-button admin-button--secondary"
                    isLoading={isApproving}
                    loadingLabel="Confirmando..."
                    onClick={handleApprove}
                    disabled={isSubmitting || isDeleting}
                  >
                    Cliente aprovou proposta
                  </LoadingButton>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="admin-row">
            <Link href="/admin/orcamentos" className="admin-button admin-button--secondary">
              Cancelar
            </Link>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingLabel="Salvando..."
              className="admin-button admin-button--primary"
              disabled={isApproving || isDeleting}
            >
              {mode === "create" ? "Salvar orcamento" : "Salvar alteracoes"}
            </LoadingButton>
          </div>
        </StickyActionBar>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Excluir este orcamento?"
        description="A proposta sera removida definitivamente. Use esta acao apenas quando voce tiver certeza de que ela nao deve permanecer no historico comercial."
        confirmLabel={isDeleting ? "Excluindo..." : "Excluir orcamento"}
        cancelLabel="Voltar"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        danger
      />
    </>
  );
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    RAW_MATERIAL: "Materia-prima",
    SERVICE: "Servico",
    FINISHED_PRODUCT: "Produto final",
    RESALE: "Revenda",
  };

  return labels[type] ?? type;
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
    EXPIRED: "Expirado",
  };

  return labels[status] ?? status;
}

function mapQuoteTone(status: string) {
  const tones: Record<string, "neutral" | "info" | "success" | "danger"> = {
    DRAFT: "neutral",
    SENT: "info",
    APPROVED: "success",
    REJECTED: "danger",
    EXPIRED: "danger",
  };

  return tones[status] ?? "neutral";
}
