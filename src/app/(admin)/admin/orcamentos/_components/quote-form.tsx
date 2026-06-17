"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { QuickCustomerPanel } from "@/components/forms/quick-customer-panel";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
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

export function QuoteForm({ mode, customers, products, initialData, quoteId }: QuoteFormProps) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(customers);
  const [form, setForm] = useState<QuoteFormState>(() => buildInitialState(initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pricing = useMemo(() => {
    const items = form.items.map((item) => {
      const quantity = parseDecimalInput(item.quantity);
      const unitPrice = parseCurrencyInput(item.unitPrice);
      const total = roundCurrency(quantity * unitPrice);

      return {
        ...item,
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
      return "Selecione o cliente do orcamento.";
    }

    if (parseCurrencyInput(form.discountAmount) < 0) {
      return "O desconto nao pode ser negativo.";
    }

    for (const [index, item] of form.items.entries()) {
      if (item.description.trim().length < 2) {
        return `Informe a descricao do item ${index + 1}.`;
      }

      if (parseDecimalInput(item.quantity) <= 0) {
        return `Informe uma quantidade valida para o item ${index + 1}.`;
      }

      if (parseCurrencyInput(item.unitPrice) < 0) {
        return `Informe um valor unitario valido para o item ${index + 1}.`;
      }
    }

    if (parseCurrencyInput(form.discountAmount) > pricing.subtotal) {
      return "O desconto nao pode ser maior que o subtotal.";
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
        setErrorMessage(result.message ?? "Nao foi possivel salvar o orcamento.");
        return;
      }

      const savedQuote = result.data;

      setSuccessMessage(
        mode === "create"
          ? `Orcamento ${savedQuote.code} criado com sucesso.`
          : `Orcamento ${savedQuote.code} atualizado com sucesso.`,
      );

      window.setTimeout(() => {
        router.push(mode === "create" ? `/admin/orcamentos/${savedQuote.id}` : "/admin/orcamentos");
        router.refresh();
      }, 800);
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor.");
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
        setErrorMessage(result.message ?? "Nao foi possivel aprovar o orcamento.");
        return;
      }

      setSuccessMessage(`Orcamento ${result.data.code} aprovado com sucesso.`);
      window.setTimeout(() => {
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Falha ao aprovar o orcamento.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleDelete() {
    if (!quoteId) {
      return;
    }

    const confirmed = window.confirm("Deseja realmente excluir este orcamento? Essa acao nao pode ser desfeita.");

    if (!confirmed) {
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
        setErrorMessage(result.message ?? "Nao foi possivel excluir o orcamento.");
        return;
      }

      router.push("/admin/orcamentos");
      router.refresh();
    } catch {
      setErrorMessage("Falha ao excluir o orcamento.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr",
          gap: 16,
        }}
      >
        <Field label="Cliente" required>
          {mode === "edit" ? (
            <input value={initialData?.customerName ?? ""} disabled style={{ ...inputStyle, opacity: 0.72 }} />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <SearchableSelect
                value={form.customerId}
                options={customerLookupOptions}
                onChange={(value) => updateField("customerId", value)}
                placeholder="Pesquisar cliente por nome, e-mail ou WhatsApp"
                emptyMessage="Nenhum cliente encontrado para esta busca."
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                  Nao encontrou o cliente? Cadastre sem sair da proposta.
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomer((current) => !current)}
                  style={ghostActionStyle}
                >
                  {showQuickCustomer ? "Fechar cadastro rapido" : "Cadastrar cliente rapido"}
                </button>
              </div>
              {showQuickCustomer ? (
                <QuickCustomerPanel
                  onCreated={handleCustomerCreated}
                  onCancel={() => setShowQuickCustomer(false)}
                />
              ) : null}
            </div>
          )}
        </Field>

        <Field label="Valido ate">
          <input
            type="date"
            value={form.validUntil}
            onChange={(event) => updateField("validUntil", event.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Desconto (R$)">
          <input
            value={form.discountAmount}
            onChange={(event) => updateField("discountAmount", formatCurrencyInput(event.target.value))}
            inputMode="numeric"
            placeholder="0,00"
            style={inputStyle}
          />
        </Field>
      </div>

      <section
        style={{
          display: "grid",
          gap: 14,
          padding: 20,
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.7)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Itens do orcamento</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              Pesquise itens ja cadastrados para preencher automaticamente ou descreva um servico sob medida quando
              precisar.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin/estoque/novo" style={secondaryButtonStyle}>
              Cadastrar item no estoque
            </Link>
            <button type="button" onClick={addItem} style={secondaryButtonStyle}>
              Adicionar item
            </button>
          </div>
        </div>

        {pricing.items.map((item, index) => (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.8fr 0.8fr 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(232, 217, 202, 0.8)",
              background: "rgba(255,250,244,0.8)",
            }}
          >
            <Field label={`Item cadastrado ${index + 1}`}>
              <div style={{ display: "grid", gap: 8 }}>
                <SearchableSelect
                  value={item.productId}
                  options={productLookupOptions}
                  onChange={(value) => handleProductSelection(item.id, value)}
                  placeholder="Pesquisar por nome, SKU ou EAN"
                  emptyMessage="Nenhum item cadastrado encontrado."
                  clearable
                />
                {item.productId ? (
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                    Item vinculado ao catalogo. Voce ainda pode ajustar a descricao e o valor para esta proposta.
                  </span>
                ) : (
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                    Campo opcional. Use para reaproveitar um item do estoque e ganhar velocidade.
                  </span>
                )}
              </div>
            </Field>

            <Field label={`Descricao do item ${index + 1}`} required>
              <input
                value={item.description}
                onChange={(event) => updateItem(item.id, "description", event.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Quantidade" required>
              <input
                type="number"
                min="0"
                step="0.001"
                value={item.quantity || ""}
                onChange={(event) => updateItem(item.id, "quantity", normalizeDecimalInput(event.target.value))}
                inputMode="decimal"
                style={inputStyle}
              />
            </Field>

            <Field label="Valor unitario" required>
              <input
                value={item.unitPrice || ""}
                onChange={(event) => updateItem(item.id, "unitPrice", formatCurrencyInput(event.target.value))}
                inputMode="numeric"
                style={inputStyle}
              />
            </Field>

            <Field label="Total">
              <div style={readonlyBoxStyle}>{formatCurrency(item.total)}</div>
            </Field>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              disabled={form.items.length === 1}
              style={dangerGhostButtonStyle}
            >
              Remover
            </button>
          </div>
        ))}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 16,
        }}
      >
        <Field label="Observacoes">
          <textarea
            rows={6}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            style={{ ...inputStyle, height: "auto", padding: 14 }}
          />
        </Field>

        <section
          style={{
            display: "grid",
            gap: 10,
            padding: 18,
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(181,66,31,0.08), rgba(255,255,255,0.9))",
            alignContent: "start",
          }}
        >
          <SummaryRow label="Subtotal" value={formatCurrency(pricing.subtotal)} />
          <SummaryRow label="Desconto" value={formatCurrency(pricing.discountAmount)} />
          <SummaryRow label="Total" value={formatCurrency(pricing.totalAmount)} strong />
        </section>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          paddingTop: 10,
          borderTop: "1px solid rgba(232, 217, 202, 0.85)",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {mode === "edit" ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                style={dangerButtonStyle}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
              {initialData?.status !== "APPROVED" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving || isSubmitting}
                    style={approveButtonStyle}
                  >
                    {isApproving ? "Confirmando..." : "Cliente aprovou proposta"}
                  </button>
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                    Use esta acao quando o cliente aceitar formalmente o orcamento e ele estiver pronto para virar
                    pedido.
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/orcamentos" style={secondaryButtonStyle}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting || isApproving || isDeleting} style={primaryButtonStyle}>
            {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar orcamento" : "Salvar alteracoes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>
        {label}
        {required ? <strong style={{ color: "var(--primary)" }}> *</strong> : null}
      </span>
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span style={{ color: "var(--muted)", fontWeight: strong ? 700 : 500 }}>{label}</span>
      <strong style={{ fontSize: strong ? 22 : 18 }}>{value}</strong>
    </div>
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
  };

  return labels[type] ?? type;
}

const inputStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const readonlyBoxStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(232, 217, 202, 0.9)",
  background: "rgba(255,255,255,0.72)",
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
} as const;

const primaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
} as const;

const ghostActionStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const approveButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "#245844",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const dangerButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "#a72d2d",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const dangerGhostButtonStyle = {
  height: 44,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(167, 45, 45, 0.2)",
  background: "rgba(167, 45, 45, 0.08)",
  color: "#8b2323",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const feedbackStyle = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 14,
  lineHeight: 1.6,
} as const;

const errorStyle = {
  background: "rgba(181, 66, 31, 0.12)",
  color: "var(--primary)",
} as const;

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
} as const;
