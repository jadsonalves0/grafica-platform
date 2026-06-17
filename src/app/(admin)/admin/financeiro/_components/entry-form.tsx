"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

type CustomerOption = {
  id: string;
  name: string;
};

type OrderOption = {
  id: string;
  code: string;
  customerName: string;
};

type QuoteOption = {
  id: string;
  code: string;
  customerName: string;
};

type FinancialCategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  salePrice: number;
  type: string;
  isActive: boolean;
};

type EntryItemState = {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type EntryFormState = {
  accountId: string;
  financialCategoryId: string;
  customerId: string;
  orderId: string;
  quoteId: string;
  entryType: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: string;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  items: EntryItemState[];
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type EntryFormProps = {
  mode: "create" | "edit";
  entryId?: string;
  initialState?: EntryFormState;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    paidAt?: string | null;
  };
};

const defaultState: EntryFormState = {
  accountId: "",
  financialCategoryId: "",
  customerId: "",
  orderId: "",
  quoteId: "",
  entryType: "INCOME",
  category: "",
  description: "",
  amount: "0,00",
  dueDate: "",
  status: "PENDING",
  items: [],
};

function createEmptyItem(): EntryItemState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "0,00",
  };
}

export function EntryForm({ mode, entryId, initialState, metadata }: Readonly<EntryFormProps>) {
  const router = useRouter();
  const [form, setForm] = useState<EntryFormState>(initialState ?? defaultState);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<FinancialCategoryOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const customersEndpoint = mode === "edit" ? "/api/customers?includeInactive=true" : "/api/customers";
        const [accountsResponse, categoriesResponse, customersResponse, ordersResponse, quotesResponse, productsResponse] =
          await Promise.all([
            fetch("/api/financial/accounts", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/financial/categories", { signal: controller.signal, cache: "no-store" }),
            fetch(customersEndpoint, { signal: controller.signal, cache: "no-store" }),
            fetch("/api/orders", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/quotes", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/inventory/products", { signal: controller.signal, cache: "no-store" }),
          ]);

        const accountsResult = (await accountsResponse.json()) as ApiResult<AccountOption[]>;
        const categoriesResult = (await categoriesResponse.json()) as ApiResult<FinancialCategoryOption[]>;
        const customersResult = (await customersResponse.json()) as ApiResult<CustomerOption[]>;
        const ordersResult = (await ordersResponse.json()) as ApiResult<OrderOption[]>;
        const quotesResult = (await quotesResponse.json()) as ApiResult<QuoteOption[]>;
        const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;

        if (!accountsResponse.ok || !accountsResult.success || !accountsResult.data) {
          setErrorMessage(accountsResult.message ?? "Nao foi possivel carregar as contas.");
          return;
        }

        if (!categoriesResponse.ok || !categoriesResult.success || !categoriesResult.data) {
          setErrorMessage(categoriesResult.message ?? "Nao foi possivel carregar as categorias.");
          return;
        }

        if (!customersResponse.ok || !customersResult.success || !customersResult.data) {
          setErrorMessage(customersResult.message ?? "Nao foi possivel carregar os clientes.");
          return;
        }

        if (!ordersResponse.ok || !ordersResult.success || !ordersResult.data) {
          setErrorMessage(ordersResult.message ?? "Nao foi possivel carregar os pedidos.");
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

        setAccounts(accountsResult.data);
        setCategories(categoriesResult.data);
        setCustomers(customersResult.data);
        setOrders(ordersResult.data);
        setQuotes(quotesResult.data);
        setProducts(productsResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar os dados auxiliares.");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();

    return () => controller.abort();
  }, [mode]);

  const accountLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name,
        description: formatAccountType(account.type),
        keywords: [account.type],
      })),
    [accounts],
  );

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === form.entryType),
    [categories, form.entryType],
  );

  const categoryLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      filteredCategories.map((category) => ({
        value: category.id,
        label: category.name,
        description: category.isActive ? "Categoria ativa" : "Categoria inativa",
      })),
    [filteredCategories],
  );

  const customerLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers],
  );

  const orderLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      orders.map((order) => ({
        value: order.id,
        label: `${order.code} | ${order.customerName}`,
        keywords: [order.code, order.customerName],
      })),
    [orders],
  );

  const quoteLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      quotes.map((quote) => ({
        value: quote.id,
        label: `${quote.code} | ${quote.customerName}`,
        keywords: [quote.code, quote.customerName],
      })),
    [quotes],
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
          `Venda sugerida ${formatCurrency(product.salePrice)}`,
        ].join(" | "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit, formatType(product.type)],
      })),
    [availableProducts],
  );

  const isItemizedSale = form.entryType === "INCOME" && form.items.length > 0;

  const computedItems = useMemo(
    () =>
      form.items.map((item) => {
        const quantity = parseDecimalInput(item.quantity);
        const unitPrice = parseCurrencyInput(item.unitPrice);
        return {
          ...item,
          quantity,
          unitPrice,
          totalPrice: roundCurrency(quantity * unitPrice),
        };
      }),
    [form.items],
  );

  const computedAmount = useMemo(
    () => roundCurrency(computedItems.reduce((sum, item) => sum + item.totalPrice, 0)),
    [computedItems],
  );

  useEffect(() => {
    if (form.entryType === "EXPENSE" && form.items.length) {
      setForm((current) => ({
        ...current,
        items: [],
      }));
    }
  }, [form.entryType, form.items.length]);

  function updateField<K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEntryType(value: EntryFormState["entryType"]) {
    setForm((current) => {
      const validCategory = categories.find(
        (category) => category.id === current.financialCategoryId && category.type === value,
      );

      return {
        ...current,
        entryType: value,
        financialCategoryId: validCategory ? validCategory.id : "",
        category: validCategory ? validCategory.name : "",
        items: value === "EXPENSE" ? [] : current.items,
      };
    });
  }

  function toggleItemizedSale() {
    setForm((current) => ({
      ...current,
      items: current.items.length ? [] : [createEmptyItem()],
    }));
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
      items: current.items.length === 1 ? [] : current.items.filter((item) => item.id !== itemId),
    }));
  }

  function updateItem(itemId: string, field: keyof EntryItemState, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  }

  function handleProductSelection(itemId: string, productId: string) {
    const product = availableProducts.find((item) => item.id === productId);

    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId,
              description: product ? product.name : item.description,
              unitPrice: product ? formatCurrencyValue(product.salePrice) : item.unitPrice,
            }
          : item,
      ),
    }));
  }

  function validateForm() {
    if (!form.accountId) {
      return "Selecione a conta financeira.";
    }

    if (!form.financialCategoryId) {
      return "Selecione uma categoria cadastrada.";
    }

    if (form.description.trim().length < 2) {
      return "Informe a descricao do lancamento.";
    }

    if (!form.dueDate) {
      return "Informe a data de vencimento.";
    }

    if (isItemizedSale) {
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

      if (computedAmount <= 0) {
        return "A venda avulsa precisa ter valor maior que zero.";
      }
    } else if (parseCurrencyInput(form.amount) <= 0) {
      return "Informe um valor maior que zero.";
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
      const selectedCategory = categories.find((category) => category.id === form.financialCategoryId);
      const payload = {
        accountId: form.accountId,
        financialCategoryId: form.financialCategoryId,
        customerId: form.customerId || undefined,
        orderId: form.orderId || undefined,
        quoteId: form.quoteId || undefined,
        entryType: form.entryType,
        category: selectedCategory?.name ?? form.category,
        description: form.description.trim(),
        amount: isItemizedSale ? computedAmount : parseCurrencyInput(form.amount),
        dueDate: form.dueDate,
        items: isItemizedSale
          ? form.items.map((item) => ({
              productId: item.productId || undefined,
              description: item.description.trim(),
              quantity: parseDecimalInput(item.quantity),
              unitPrice: parseCurrencyInput(item.unitPrice),
            }))
          : [],
      };

      const endpoint = mode === "create" ? "/api/financial/entries" : `/api/financial/entries/${entryId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar o lancamento.");
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Lancamento cadastrado com sucesso."
          : "Lancamento atualizado com sucesso.",
      );

      window.setTimeout(() => {
        router.push(
          `/admin/financeiro?feedback=${mode === "create" ? "entry-created" : "entry-updated"}`,
        );
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusUpdate() {
    if (mode !== "edit" || !entryId) {
      return;
    }

    setIsSavingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/financial/entries/${entryId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: form.status,
        }),
      });

      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o status.");
        return;
      }

      setSuccessMessage("Status financeiro atualizado com sucesso.");
    } catch {
      setErrorMessage("Falha ao atualizar o status.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <>
      {metadata?.createdAt || metadata?.updatedAt ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <InfoCard label="Criado em" value={metadata.createdAt ? formatDate(metadata.createdAt) : "-"} />
          <InfoCard label="Ultima atualizacao" value={metadata.updatedAt ? formatDate(metadata.updatedAt) : "-"} />
          <InfoCard label="Pagamento" value={metadata.paidAt ? formatDate(metadata.paidAt) : "Pendente"} accent={Boolean(metadata.paidAt)} />
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
            <h2 style={{ margin: 0 }}>Status do lancamento</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Ajuste rapidamente a situacao financeira sem reescrever os demais dados.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as EntryFormState["status"])}
                style={inputStyle}
              >
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </Field>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button type="button" onClick={handleStatusUpdate} disabled={isSavingStatus} style={ghostButtonStyle}>
                {isSavingStatus ? "Atualizando..." : "Atualizar status"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 18,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <section style={panelStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Contexto do lancamento</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Selecione a conta, a categoria oficial e, quando existir, os vinculos comerciais.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <Field label="Conta financeira" required>
              <SearchableSelect
                value={form.accountId}
                onChange={(value) => updateField("accountId", value)}
                options={accountLookupOptions}
                placeholder="Pesquisar conta financeira"
                disabled={isLoadingOptions}
                emptyMessage="Nenhuma conta encontrada."
              />
            </Field>

            <Field label="Natureza" required>
              <select
                value={form.entryType}
                onChange={(event) => updateEntryType(event.target.value as EntryFormState["entryType"])}
                style={inputStyle}
              >
                <option value="INCOME">Receita</option>
                <option value="EXPENSE">Despesa</option>
              </select>
            </Field>

            <Field label="Categoria" required>
              <div style={{ display: "grid", gap: 8 }}>
                <SearchableSelect
                  value={form.financialCategoryId}
                  onChange={(value) => {
                    const selectedCategory = categories.find((category) => category.id === value);
                    updateField("financialCategoryId", value);
                    updateField("category", selectedCategory?.name ?? "");
                  }}
                  options={categoryLookupOptions}
                  placeholder="Selecionar categoria"
                  disabled={isLoadingOptions}
                  emptyMessage="Nenhuma categoria encontrada para essa natureza."
                />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                    {filteredCategories.length
                      ? "Use categorias padronizadas para manter os relatorios confiaveis."
                      : "Nao existe categoria cadastrada para essa natureza ainda."}
                  </span>
                  <Link href="/admin/financeiro/categorias/nova" style={miniActionStyle}>
                    Nova categoria
                  </Link>
                </div>
              </div>
            </Field>

            <Field label="Cliente">
              <SearchableSelect
                value={form.customerId}
                onChange={(value) => updateField("customerId", value)}
                options={customerLookupOptions}
                placeholder="Pesquisar cliente"
                disabled={isLoadingOptions}
                emptyMessage="Nenhum cliente encontrado."
                clearable
              />
            </Field>

            <Field label="Pedido">
              <SearchableSelect
                value={form.orderId}
                onChange={(value) => updateField("orderId", value)}
                options={orderLookupOptions}
                placeholder="Pesquisar pedido"
                disabled={isLoadingOptions}
                emptyMessage="Nenhum pedido encontrado."
                clearable
              />
            </Field>

            <Field label="Orcamento">
              <SearchableSelect
                value={form.quoteId}
                onChange={(value) => updateField("quoteId", value)}
                options={quoteLookupOptions}
                placeholder="Pesquisar orcamento"
                disabled={isLoadingOptions}
                emptyMessage="Nenhum orcamento encontrado."
                clearable
              />
            </Field>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>Composicao financeira</h2>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                Registre uma despesa avulsa, uma receita simples ou detalhe uma venda avulsa com itens vendidos.
              </p>
            </div>

            {form.entryType === "INCOME" ? (
              <button type="button" onClick={toggleItemizedSale} style={ghostButtonStyle}>
                {isItemizedSale ? "Remover itens da venda avulsa" : "Lancar venda avulsa com itens"}
              </button>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)" }}>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Descricao" required>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={4}
                  maxLength={255}
                  style={{ ...inputStyle, minHeight: 130, height: "auto", padding: 14 }}
                  placeholder={
                    form.entryType === "EXPENSE"
                      ? "Ex.: Pagamento de frete, energia, reposicao de tinta"
                      : isItemizedSale
                        ? "Ex.: Venda avulsa registrada no caixa"
                        : "Ex.: Recebimento de arte, servico expresso, venda balcão"
                  }
                />
              </Field>

              {isItemizedSale ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 18,
                    borderRadius: 20,
                    border: "1px solid rgba(232, 217, 202, 0.9)",
                    background: "rgba(255,255,255,0.74)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <strong style={{ display: "block", marginBottom: 6 }}>Itens da venda avulsa</strong>
                      <span style={{ color: "var(--muted)", fontSize: 14 }}>
                        Associe os itens vendidos para dar rastreabilidade ao caixa.
                      </span>
                    </div>
                    <button type="button" onClick={addItem} style={secondaryButtonStyle}>
                      Adicionar item
                    </button>
                  </div>

                  {computedItems.map((item, index) => (
                    <article
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 1.6fr 0.8fr 0.9fr 0.9fr auto",
                        gap: 12,
                        alignItems: "end",
                        padding: 16,
                        borderRadius: 18,
                        border: "1px solid var(--border)",
                        background: "#fff",
                      }}
                    >
                      <Field label={`Item cadastrado ${index + 1}`}>
                        <SearchableSelect
                          value={item.productId}
                          onChange={(value) => handleProductSelection(item.id, value)}
                          options={productLookupOptions}
                          placeholder="Pesquisar por nome, SKU ou EAN"
                          emptyMessage="Nenhum item encontrado."
                          clearable
                        />
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
                          onChange={(event) => updateItem(item.id, "quantity", normalizeDecimalInput(event.target.value))}
                          inputMode="decimal"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Valor unitario" required>
                        <input
                          value={item.unitPrice}
                          onChange={(event) => updateItem(item.id, "unitPrice", formatCurrencyInput(event.target.value))}
                          inputMode="numeric"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Total">
                        <div style={readonlyBoxStyle}>{formatCurrency(item.totalPrice)}</div>
                      </Field>

                      <button type="button" onClick={() => removeItem(item.id)} style={dangerGhostButtonStyle}>
                        Remover
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Vencimento" required>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label={isItemizedSale ? "Valor calculado" : "Valor"} required>
                {isItemizedSale ? (
                  <div style={readonlyAmountStyle}>{formatCurrency(computedAmount)}</div>
                ) : (
                  <input
                    value={form.amount}
                    onChange={(event) => updateField("amount", formatCurrencyInput(event.target.value))}
                    style={inputStyle}
                    inputMode="numeric"
                  />
                )}
              </Field>

              <section
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 18,
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "linear-gradient(180deg, rgba(181,66,31,0.08), rgba(255,255,255,0.9))",
                }}
              >
                <SummaryRow label="Natureza" value={form.entryType === "INCOME" ? "Receita" : "Despesa"} />
                <SummaryRow label="Categoria" value={form.category || "A selecionar"} />
                <SummaryRow
                  label={isItemizedSale ? "Venda avulsa" : "Total"}
                  value={formatCurrency(isItemizedSale ? computedAmount : parseCurrencyInput(form.amount))}
                  strong
                />
              </section>
            </div>
          </div>
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
          <Link href="/admin/financeiro" style={secondaryButtonStyle}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting || isLoadingOptions} style={primaryButtonStyle}>
            {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar lancamento" : "Salvar alteracoes"}
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

function SummaryRow({
  label,
  value,
  strong,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <span style={{ color: "var(--muted)", fontWeight: strong ? 700 : 500 }}>{label}</span>
      <strong style={{ fontSize: strong ? 22 : 18 }}>{value}</strong>
    </div>
  );
}

function InfoCard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: accent ? "rgba(43, 110, 82, 0.12)" : "rgba(255,255,255,0.75)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: accent ? "#245844" : "var(--primary)",
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatAccountType(type: string) {
  const labels: Record<string, string> = {
    BANK: "Banco",
    CASH: "Caixa",
    DIGITAL_WALLET: "Carteira digital",
  };

  return labels[type] ?? type;
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    RAW_MATERIAL: "Materia-prima",
    SERVICE: "Servico",
    FINISHED_PRODUCT: "Produto final",
  };

  return labels[type] ?? type;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

const panelStyle = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 22,
  border: "1px solid rgba(232, 217, 202, 0.9)",
  background: "rgba(255,255,255,0.76)",
} as const;

const inputStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const readonlyAmountStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(232, 217, 202, 0.9)",
  background: "rgba(255,255,255,0.72)",
  display: "flex",
  alignItems: "center",
  fontWeight: 800,
  fontSize: 20,
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
} as const;

const ghostButtonStyle = {
  height: 46,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const miniActionStyle = {
  height: 36,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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
