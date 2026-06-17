"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
};

type QuoteOption = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  status: string;
  totalAmount: number;
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

type OrderItemState = {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type OrderDetail = {
  id: string;
  customerId: string;
  customerName: string;
  quoteId?: string | null;
  code: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  productionStatus: "PENDING" | "IN_PRODUCTION" | "WAITING_APPROVAL" | "READY" | "DELIVERED";
  deliveryDate?: string | null;
  notes?: string | null;
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type OrderFormProps = {
  mode: "create" | "edit";
  order?: OrderDetail;
};

export function OrderForm({ mode, order }: Readonly<OrderFormProps>) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customerId, setCustomerId] = useState(order?.customerId ?? "");
  const [quoteId, setQuoteId] = useState(order?.quoteId ?? "");
  const [deliveryDate, setDeliveryDate] = useState(formatDateInput(order?.deliveryDate));
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [items, setItems] = useState<OrderItemState[]>(
    order?.items?.length
      ? order.items.map((item, index) => ({
          id: item.id || String(index + 1),
          productId: item.productId ?? "",
          description: item.description,
          quantity: normalizeDecimalInput(formatDecimal(item.quantity)),
          unitPrice: formatCurrencyValue(item.unitPrice),
        }))
      : [createEmptyItem()],
  );
  const [status, setStatus] = useState(order?.status ?? "OPEN");
  const [productionStatus, setProductionStatus] = useState(order?.productionStatus ?? "PENDING");
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const customersEndpoint = mode === "edit" ? "/api/customers?includeInactive=true" : "/api/customers";
        const [customersResponse, quotesResponse, productsResponse] = await Promise.all([
          fetch(customersEndpoint, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/quotes", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inventory/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const customersResult = (await customersResponse.json()) as ApiResult<
          Array<{ id: string; name: string }>
        >;
        const quotesResult = (await quotesResponse.json()) as ApiResult<
          Array<{
            id: string;
            code: string;
            customerId: string;
            customerName: string;
            status: string;
            totalAmount: number;
          }>
        >;
        const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;

        if (!customersResponse.ok || !customersResult.success || !customersResult.data) {
          setErrorMessage(customersResult.message ?? "Nao foi possivel carregar os clientes.");
          return;
        }

        if (!quotesResponse.ok || !quotesResult.success || !quotesResult.data) {
          setErrorMessage(quotesResult.message ?? "Nao foi possivel carregar os orcamentos.");
          return;
        }

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens.");
          return;
        }

        setCustomers(customersResult.data);
        setQuotes(quotesResult.data.filter((quote) => quote.status === "APPROVED"));
        setProducts(productsResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar os dados auxiliares do pedido.");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();

    return () => controller.abort();
  }, [mode]);

  useEffect(() => {
    if (!quoteId || mode !== "create") {
      return;
    }

    const selectedQuote = quotes.find((quote) => quote.id === quoteId);
    if (selectedQuote) {
      setCustomerId(selectedQuote.customerId);
    }
  }, [mode, quoteId, quotes]);

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === quoteId) ?? null,
    [quoteId, quotes],
  );

  const customerLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers],
  );

  const quoteLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      quotes.map((quote) => ({
        value: quote.id,
        label: `${quote.code} • ${quote.customerName}`,
        description: `Total ${formatCurrency(quote.totalAmount)}`,
        keywords: [quote.code, quote.customerName],
      })),
    [quotes],
  );

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.isActive || items.some((item) => item.productId === product.id),
      ),
    [items, products],
  );

  const productLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      availableProducts.map((product) => ({
        value: product.id,
        label: product.name,
        description: [
          product.sku ? `SKU ${product.sku}` : "Sem SKU",
          product.barcode ? `EAN ${product.barcode}` : "Sem EAN",
          `${formatType(product.type)} • ${product.unit}`,
          `Saldo ${formatNumber(product.currentStock)}`,
          `Venda sugerida ${formatCurrency(product.salePrice)}`,
        ].join(" • "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit, formatType(product.type)],
      })),
    [availableProducts],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = parseDecimalInput(item.quantity);
        const unitPrice = parseCurrencyInput(item.unitPrice);
        return sum + quantity * unitPrice;
      }, 0),
    [items],
  );

  function updateItem(itemId: string, field: keyof OrderItemState, value: string) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  }

  function handleProductSelection(itemId: string, productId: string) {
    const selectedProduct = availableProducts.find((product) => product.id === productId);

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId,
              description: selectedProduct ? selectedProduct.name : item.description,
              unitPrice: selectedProduct
                ? formatCurrencyValue(selectedProduct.salePrice)
                : item.unitPrice,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()]);
  }

  function removeItem(itemId: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== itemId) : current));
  }

  function handleCustomerCreated(customer: {
    id: string;
    name: string;
    email?: string | null;
    whatsapp?: string | null;
  }) {
    setCustomers((current) =>
      [...current, { id: customer.id, name: customer.name }]
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    );
    setCustomerId(customer.id);
    setShowQuickCustomer(false);
    setSuccessMessage("Cliente cadastrado e selecionado com sucesso.");
    setErrorMessage(null);
  }

  function validateForm() {
    if (mode === "create" && !quoteId && !customerId) {
      return "Selecione um cliente ou vincule um orcamento aprovado.";
    }

    if (!selectedQuote) {
      for (const [index, item] of items.entries()) {
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
      const payload =
        mode === "create"
          ? quoteId
            ? {
                quoteId,
                deliveryDate: deliveryDate || undefined,
                notes,
              }
            : {
                customerId,
                deliveryDate: deliveryDate || undefined,
                notes: notes.trim(),
                items: items.map((item) => ({
                  productId: item.productId || undefined,
                  description: item.description.trim(),
                  quantity: parseDecimalInput(item.quantity),
                  unitPrice: parseCurrencyInput(item.unitPrice),
                })),
              }
          : {
              deliveryDate: deliveryDate || undefined,
              notes: notes.trim(),
              items: items.map((item) => ({
                productId: item.productId || undefined,
                description: item.description.trim(),
                quantity: parseDecimalInput(item.quantity),
                unitPrice: parseCurrencyInput(item.unitPrice),
              })),
            };

      const response = await fetch(mode === "create" ? "/api/orders" : `/api/orders/${order?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResult<{ id: string; code: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o pedido.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Pedido criado com sucesso."
          : "Pedido atualizado com sucesso.",
      );

      window.setTimeout(() => {
        if (!result.data) {
          return;
        }

        if (mode === "create") {
          router.push(`/admin/pedidos/${result.data.id}`);
        } else {
          router.push("/admin/pedidos?feedback=updated");
        }
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusUpdate() {
    if (!order) {
      return;
    }

    setIsSavingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          productionStatus,
        }),
      });

      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o andamento.");
        return;
      }

      setSuccessMessage("Andamento atualizado com sucesso.");
    } catch {
      setErrorMessage("Falha ao atualizar o andamento.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <>
      {mode === "edit" && order ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <InfoCard label="Pedido" value={order.code} />
          <InfoCard label="Cliente" value={order.customerName} />
          <InfoCard label="Criado em" value={formatDate(order.createdAt)} />
        </section>
      ) : null}

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      {mode === "edit" ? (
        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 24,
            borderRadius: 24,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.78)",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Andamento do pedido</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Atualize a situação comercial e o estágio de produção sem reabrir o cadastro inteiro.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Field label="Status do pedido" required>
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} style={inputStyle}>
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="COMPLETED">Concluido</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </Field>

            <Field label="Status de producao" required>
              <select
                value={productionStatus}
                onChange={(event) => setProductionStatus(event.target.value as typeof productionStatus)}
                style={inputStyle}
              >
                <option value="PENDING">Pendente</option>
                <option value="IN_PRODUCTION">Em producao</option>
                <option value="WAITING_APPROVAL">Aguardando aprovacao</option>
                <option value="READY">Pronto</option>
                <option value="DELIVERED">Entregue</option>
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={handleStatusUpdate} disabled={isSavingStatus} style={ghostButtonStyle}>
              {isSavingStatus ? "Atualizando..." : "Atualizar andamento"}
            </button>
          </div>
        </section>
      ) : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <Field label="Cliente" required={mode === "create" && !quoteId}>
            {mode === "edit" ? (
              <input value={order?.customerName ?? ""} disabled style={{ ...inputStyle, opacity: 0.72 }} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <SearchableSelect
                  value={customerId}
                  onChange={setCustomerId}
                  options={customerLookupOptions}
                  placeholder="Pesquisar cliente por nome"
                  disabled={Boolean(quoteId) || isLoadingOptions}
                  emptyMessage="Nenhum cliente encontrado."
                />
                {!quoteId ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                      Nao encontrou o cliente na lista? Cadastre sem sair do pedido.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCustomer((current) => !current)}
                      style={ghostActionStyle}
                    >
                      {showQuickCustomer ? "Fechar cadastro rapido" : "Cadastrar cliente rapido"}
                    </button>
                  </div>
                ) : null}
                {showQuickCustomer && !quoteId ? (
                  <QuickCustomerPanel
                    onCreated={handleCustomerCreated}
                    onCancel={() => setShowQuickCustomer(false)}
                  />
                ) : null}
              </div>
            )}
          </Field>

          <Field label="Orcamento aprovado">
            {mode === "edit" ? (
              <input value={order?.quoteId ? "Vinculado" : "Manual"} disabled style={{ ...inputStyle, opacity: 0.72 }} />
            ) : (
              <SearchableSelect
                value={quoteId}
                onChange={setQuoteId}
                options={quoteLookupOptions}
                placeholder="Pesquisar orcamento aprovado"
                disabled={isLoadingOptions}
                emptyMessage="Nenhum orcamento aprovado disponivel."
                clearable
              />
            )}
          </Field>

          <Field label="Entrega">
            <input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} style={inputStyle} />
          </Field>
        </div>

        {selectedQuote && mode === "create" ? (
          <p style={{ ...feedbackStyle, background: "rgba(43, 110, 82, 0.12)", color: "#245844" }}>
            O pedido sera criado a partir do orcamento {selectedQuote.code}, reaproveitando cliente e itens aprovados.
          </p>
        ) : (
          <section
            style={{
              display: "grid",
              gap: 16,
              padding: 20,
              borderRadius: 22,
              border: "1px solid rgba(232, 217, 202, 0.9)",
              background: "rgba(255,255,255,0.76)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>Itens do pedido</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                  Monte a execução manualmente ou aproveite o vínculo com o estoque depois.
                </p>
              </div>

              <button type="button" onClick={addItem} style={secondaryButtonStyle}>
                Adicionar item
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item, index) => {
                const quantity = Number(item.quantity.replace(",", ".") || 0);
                const unitPrice = parseCurrencyInput(item.unitPrice);
                const total = quantity * unitPrice;

                return (
                  <article
                    key={item.id}
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "1.3fr 1.7fr 0.8fr 0.9fr 0.9fr auto",
                      alignItems: "end",
                      padding: 16,
                      borderRadius: 18,
                      border: "1px solid var(--border)",
                      background: "#fff",
                    }}
                  >
                    <Field label={`Item cadastrado ${index + 1}`}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <SearchableSelect
                          value={item.productId}
                          options={productLookupOptions}
                          onChange={(value) => handleProductSelection(item.id, value)}
                          placeholder="Pesquisar por nome ou SKU"
                          emptyMessage="Nenhum item cadastrado encontrado."
                          clearable
                        />
                        {item.productId ? (
                          <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                            Item vinculado ao catalogo. Voce pode ajustar descricao e valor somente para este pedido.
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                            Campo opcional. Use para reaproveitar um item do catalogo ou registre um servico manual.
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
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, "quantity", normalizeDecimalInput(event.target.value))
                        }
                        inputMode="decimal"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Valor unitario" required>
                      <input
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.id, "unitPrice", formatCurrencyInput(event.target.value))
                        }
                        inputMode="numeric"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Total">
                      <input value={formatCurrency(total)} disabled style={{ ...inputStyle, opacity: 0.72 }} />
                    </Field>

                    <button type="button" onClick={() => removeItem(item.id)} style={dangerButtonStyle}>
                      Remover
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <Field label="Observacoes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            style={{ ...inputStyle, minHeight: 150, padding: 14, height: "auto" }}
          />
        </Field>

        <section
          style={{
            display: "grid",
            gap: 10,
            justifyItems: "end",
            padding: 20,
            borderRadius: 20,
            border: "1px solid rgba(232, 217, 202, 0.9)",
            background: "rgba(255,255,255,0.75)",
          }}
        >
          <strong style={{ fontSize: 18 }}>Total previsto</strong>
          <span style={{ fontSize: 34, fontWeight: 800 }}>
            {formatCurrency(selectedQuote ? selectedQuote.totalAmount : subtotal)}
          </span>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 10,
            borderTop: "1px solid rgba(232, 217, 202, 0.85)",
          }}
        >
          <Link href="/admin/pedidos" style={secondaryButtonStyle}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting || isLoadingOptions} style={primaryButtonStyle}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar pedido"
                : "Salvar alteracoes"}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
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

function InfoCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.75)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "var(--primary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: 28 }}>{value}</h2>
    </article>
  );
}

function createEmptyItem(): OrderItemState {
  return {
    id: Math.random().toString(36).slice(2),
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "0,00",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
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
  height: 44,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const ghostButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
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

const dangerButtonStyle = {
  height: 44,
  padding: "0 16px",
  borderRadius: 14,
  border: 0,
  background: "#a72d2d",
  color: "#fff",
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
