"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
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
import {
  useCustomerLookup,
  type CustomerLookupOption,
} from "@/lib/forms/use-customer-lookup";

type CustomerOption = CustomerLookupOption;

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
  totalAmount: number;
  notes?: string | null;
  hasLinkedSale?: boolean;
  linkedSaleEntryId?: string | null;
  readyForSale?: boolean;
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
  onOrderChanged?: (order: OrderDetail) => void;
};

export function OrderForm({ mode, order, onOrderChanged }: Readonly<OrderFormProps>) {
  const router = useRouter();
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
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
    if (errorMessage) {
      errorSummaryRef.current?.focus();
    }
  }, [errorMessage]);

  const {
    currentQuery: customerSearchQuery,
    customerLookupOptions,
    isSearching: isSearchingCustomers,
    searchError: customerSearchError,
    setQuery: setCustomerSearchQuery,
    registerCustomer,
  } = useCustomerLookup({
    initialCustomers: order?.customerId && order?.customerName ? [{ id: order.customerId, name: order.customerName }] : [],
    includeInactive: mode === "edit",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const [quotesResponse, productsResponse] = await Promise.all([
          fetch("/api/quotes", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inventory/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const quotesResult = (await quotesResponse.json()) as ApiResult<Array<QuoteOption>>;
        const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;

        if (!quotesResponse.ok || !quotesResult.success || !quotesResult.data) {
          setErrorMessage(quotesResult.message ?? "Nao foi possivel carregar os orcamentos aprovados.");
          return;
        }

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens do catalogo.");
          return;
        }

        setQuotes(quotesResult.data.filter((quote) => quote.status === "APPROVED"));
        setProducts(productsResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Nao foi possivel preparar o pedido. Recarregue a pagina e tente novamente.");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadOptions();

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

  const quoteLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      quotes.map((quote) => ({
        value: quote.id,
        label: `${quote.code} | ${quote.customerName}`,
        description: `Total ${formatCurrency(quote.totalAmount)}`,
        keywords: [quote.code, quote.customerName],
      })),
    [quotes],
  );

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.isActive || items.some((item) => item.productId === product.id),
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
          `${formatType(product.type)} | ${product.unit}`,
          `Saldo ${formatNumber(product.currentStock)}`,
          `Venda sugerida ${formatCurrency(product.salePrice)}`,
        ].join(" | "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit, formatType(product.type)],
      })),
    [availableProducts],
  );

  const subtotal = useMemo(
    () =>
      roundCurrency(
        items.reduce((sum, item) => {
          const quantity = parseDecimalInput(item.quantity);
          const unitPrice = parseCurrencyInput(item.unitPrice);
          return sum + quantity * unitPrice;
        }, 0),
      ),
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
              unitPrice: selectedProduct ? formatCurrencyValue(selectedProduct.salePrice) : item.unitPrice,
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
    registerCustomer(customer);
    setCustomerId(customer.id);
    setShowQuickCustomer(false);
    setSuccessMessage("Cliente cadastrado e selecionado com sucesso.");
    setErrorMessage(null);
  }

  function validateForm() {
    if (mode === "create" && !quoteId && !customerId) {
      return "Nao foi possivel salvar o pedido. Selecione um cliente ou vincule um orcamento aprovado.";
    }

    if (!selectedQuote) {
      for (const [index, item] of items.entries()) {
        if (item.description.trim().length < 2) {
          return `Nao foi possivel salvar o pedido. Revise a descricao do item ${index + 1} e informe pelo menos 2 caracteres.`;
        }

        if (parseDecimalInput(item.quantity) <= 0) {
          return `Nao foi possivel salvar o pedido. Revise a quantidade do item ${index + 1} e informe um valor maior que zero.`;
        }

        if (parseCurrencyInput(item.unitPrice) < 0) {
          return `Nao foi possivel salvar o pedido. Revise o valor unitario do item ${index + 1} e informe um valor valido.`;
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

      const result = (await response.json()) as ApiResult<OrderDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o pedido. Revise os dados e tente novamente.");
        return;
      }

      const savedOrder = result.data;

      onOrderChanged?.(savedOrder);
      setSuccessMessage(mode === "create" ? "Pedido criado com sucesso." : "Pedido atualizado com sucesso.");

      window.setTimeout(() => {
        if (mode === "create") {
          router.push(`/admin/pedidos/${savedOrder.id}`);
        } else {
          router.push("/admin/pedidos?feedback=updated");
        }
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Nao foi possivel salvar o pedido. Tente novamente. Se o problema continuar, recarregue a pagina.");
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

      const result = (await response.json()) as ApiResult<OrderDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o andamento do pedido.");
        return;
      }

      setStatus(result.data.status);
      setProductionStatus(result.data.productionStatus);
      onOrderChanged?.(result.data);
      setSuccessMessage("Andamento atualizado com sucesso.");
      router.refresh();
    } catch {
      setErrorMessage("Nao foi possivel atualizar o andamento do pedido. Tente novamente.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <div className="admin-page-stack">
      {errorMessage ? (
        <div ref={errorSummaryRef} tabIndex={-1}>
          <Alert variant="danger" title="Nao foi possivel continuar com o pedido.">
            {errorMessage}
          </Alert>
        </div>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {mode === "edit" && order ? (
        <SectionCard
          title="Andamento do pedido"
          description="Atualize rapidamente a situacao comercial e o estagio de producao sem reabrir todo o cadastro."
        >
          <div className="admin-form-grid admin-form-grid--3">
            <Field label="Status comercial" required>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
                className="admin-select"
              >
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
                className="admin-select"
              >
                <option value="PENDING">Pendente</option>
                <option value="IN_PRODUCTION">Em producao</option>
                <option value="WAITING_APPROVAL">Aguardando aprovacao</option>
                <option value="READY">Pronto</option>
                <option value="DELIVERED">Entregue</option>
              </select>
            </Field>

            <div className="admin-surface-muted">
              <span style={{ color: "var(--muted)", fontSize: 13 }}>Situacao atual</span>
              <div className="admin-row">
                <StatusBadge status={formatCommercialStatus(status)} tone={mapCommercialTone(status)} />
                <StatusBadge status={formatProductionStatus(productionStatus)} tone={mapProductionTone(productionStatus)} />
              </div>
            </div>
          </div>

          <div className="admin-row" style={{ justifyContent: "flex-end" }}>
            <LoadingButton
              type="button"
              className="admin-button admin-button--secondary"
              isLoading={isSavingStatus}
              loadingLabel="Atualizando..."
              onClick={handleStatusUpdate}
            >
              Atualizar andamento
            </LoadingButton>
          </div>
        </SectionCard>
      ) : null}

      <form onSubmit={handleSubmit} className="admin-page-stack">
        <SectionCard
          title="Cliente, origem e prazo"
          description="Defina o cliente, reaproveite um orcamento aprovado quando houver e ajuste a previsao de entrega."
        >
          <div className="admin-form-grid admin-form-grid--3">
            <Field label="Cliente" required={mode === "create" && !quoteId} helpText={mode === "edit" ? "Cliente original do pedido." : undefined}>
              {mode === "edit" ? (
                <input value={order?.customerName ?? ""} disabled className="admin-input" />
              ) : (
                <SearchableSelect
                  value={customerId}
                  onChange={setCustomerId}
                  options={customerLookupOptions}
                  placeholder="Pesquisar cliente por nome"
                  onQueryChange={setCustomerSearchQuery}
                  disabled={Boolean(quoteId) || isLoadingOptions}
                  emptyMessage={
                    customerSearchQuery.trim().length < 2
                      ? "Digite pelo menos 2 caracteres para pesquisar clientes."
                      : customerSearchError ?? "Nenhum cliente encontrado."
                  }
                  loadingMessage="Pesquisando clientes..."
                  isLoading={isSearchingCustomers}
                  inputName="orderCustomerSearch"
                  ariaLabel="Pesquisar cliente do pedido"
                />
              )}
            </Field>

            <Field label="Orcamento aprovado" optional helpText="Quando houver, o pedido pode reaproveitar os itens aprovados automaticamente.">
              {mode === "edit" ? (
                <input value={order?.quoteId ? "Vinculado" : "Manual"} disabled className="admin-input" />
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

            <Field label="Entrega" optional>
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="admin-input"
              />
            </Field>
          </div>

          {mode === "create" && !quoteId ? (
            <FormSection
              title="Cliente nao encontrado"
              description="Cadastre sem sair do pedido e continue do ponto em que voce parou."
              defaultOpen={showQuickCustomer}
            >
              <div className="admin-inline-stack">
                <div className="admin-row admin-row--between">
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    Use o cadastro rapido quando o cliente ainda nao estiver na base.
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

          {selectedQuote && mode === "create" ? (
            <Alert variant="info" title="Pedido vinculado a um orcamento aprovado.">
              O cliente e os itens serao reaproveitados do orcamento {selectedQuote.code}. Depois de salvar, voce pode seguir para producao ou revisar a situacao comercial.
            </Alert>
          ) : null}
        </SectionCard>

        {!selectedQuote || mode === "edit" ? (
          <SectionCard
            title="Itens do pedido"
            description="Monte o pedido manualmente ou reaproveite o catalogo para ganhar velocidade."
            actions={
              <button type="button" className="admin-button admin-button--secondary" onClick={addItem}>
                Adicionar item
              </button>
            }
          >
            <div className="admin-list-stack">
              {items.map((item, index) => {
                const quantity = parseDecimalInput(item.quantity);
                const unitPrice = parseCurrencyInput(item.unitPrice);
                const total = roundCurrency(quantity * unitPrice);

                return (
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
                      inputName={`orderItemSearch-${index + 1}`}
                      ariaLabel={`Pesquisar item do catalogo ${index + 1}`}
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
                          value={item.quantity}
                          onChange={(value) => updateItem(item.id, "quantity", value)}
                          className="admin-input"
                        />
                      </Field>

                      <Field label="Valor unitario" required>
                        <MoneyInput
                          value={item.unitPrice}
                          onChange={(value) => updateItem(item.id, "unitPrice", value)}
                          className="admin-input"
                        />
                      </Field>

                      <Field label="Total">
                        <div className="admin-readonly-box admin-readonly-box--emphasis">
                          {formatCurrency(total)}
                        </div>
                      </Field>
                    </div>

                    <div className="admin-row admin-row--between">
                      <span style={{ color: "var(--muted)", fontSize: 14 }}>
                        {item.productId
                          ? "Item vinculado ao catalogo. A descricao e o valor ainda podem ser ajustados so neste pedido."
                          : "Item livre. Use quando o pedido depender de um servico ou material ainda nao padronizado."}
                      </span>
                      <button type="button" className="admin-button admin-button--danger" onClick={() => removeItem(item.id)}>
                        Remover
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        <div className="admin-layout-grid admin-layout-grid--sidebar">
          <SectionCard
            title="Observacoes"
            description="Use este espaco para observacoes de entrega, atendimento ou algum detalhe operacional do pedido."
          >
            <Field label="Observacoes do pedido" optional>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="admin-textarea"
              />
            </Field>
          </SectionCard>

          <SectionCard title="Revisao" description="Confira o total previsto e a proxima acao natural do fluxo.">
            <div className="admin-summary-list">
              {mode === "edit" && order ? (
                <>
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Status comercial</span>
                    <StatusBadge status={formatCommercialStatus(status)} tone={mapCommercialTone(status)} />
                  </div>
                  <div className="admin-summary-row">
                    <span style={{ color: "var(--muted)" }}>Status de producao</span>
                    <StatusBadge status={formatProductionStatus(productionStatus)} tone={mapProductionTone(productionStatus)} />
                  </div>
                </>
              ) : null}

              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Origem</span>
                <strong>{selectedQuote ? selectedQuote.code : "Pedido manual"}</strong>
              </div>

              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Total previsto</span>
                <strong style={{ fontSize: 24 }}>
                  {formatCurrency(selectedQuote ? selectedQuote.totalAmount : subtotal)}
                </strong>
              </div>

              <div className="admin-surface-muted">
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  Depois de salvar, voce pode seguir para producao, revisar o andamento comercial ou voltar para a lista.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        <StickyActionBar>
          <div />
          <div className="admin-row">
            <Link href="/admin/pedidos" className="admin-button admin-button--secondary">
              Cancelar
            </Link>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingLabel="Salvando..."
              className="admin-button admin-button--primary"
              disabled={isLoadingOptions}
            >
              {mode === "create" ? "Salvar pedido" : "Salvar alteracoes"}
            </LoadingButton>
          </div>
        </StickyActionBar>
      </form>
    </div>
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
    RESALE: "Revenda",
  };

  return labels[type] ?? type;
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

function formatCommercialStatus(status: OrderDetail["status"]) {
  const labels: Record<OrderDetail["status"], string> = {
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluido",
    CANCELED: "Cancelado",
  };

  return labels[status];
}

function formatProductionStatus(status: OrderDetail["productionStatus"]) {
  const labels: Record<OrderDetail["productionStatus"], string> = {
    PENDING: "Pendente",
    IN_PRODUCTION: "Em producao",
    WAITING_APPROVAL: "Aguardando aprovacao",
    READY: "Pronto",
    DELIVERED: "Entregue",
  };

  return labels[status];
}

function mapCommercialTone(status: OrderDetail["status"]) {
  const tones: Record<OrderDetail["status"], "warning" | "info" | "success" | "danger"> = {
    OPEN: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELED: "danger",
  };

  return tones[status];
}

function mapProductionTone(status: OrderDetail["productionStatus"]) {
  const tones: Record<OrderDetail["productionStatus"], "warning" | "info" | "success"> = {
    PENDING: "warning",
    IN_PRODUCTION: "info",
    WAITING_APPROVAL: "warning",
    READY: "success",
    DELIVERED: "success",
  };

  return tones[status];
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
