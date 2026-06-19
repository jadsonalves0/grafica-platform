"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  EmptyState,
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
import {
  formatCurrencyInput,
  formatCurrencyValue,
  normalizeDecimalInput,
  parseCurrencyInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";
import { useUnsavedChanges } from "@/lib/forms/use-unsaved-changes";

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

type CustomerOption = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
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
  categoryId?: string | null;
  categoryName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: string;
  controlsStock: boolean;
  currentStock: number;
  costPrice: number;
  salePrice: number;
  desiredMargin?: number | null;
  isActive: boolean;
};

type GroupOption = {
  id: string;
  name: string;
  active: boolean;
};

type OperationalSettings = {
  defaultMarginPercent: number;
  minimumMarginPercent: number;
  regularDiscountLimitPercent: number;
  managerDiscountLimitPercent: number;
  allowNegativeStock: boolean;
};

type SaleItemState = {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
};

type SaleFormState = {
  accountId: string;
  financialCategoryId: string;
  customerId: string;
  orderId: string;
  quoteId: string;
  description: string;
  dueDate: string;
  paymentStatus: "PAID" | "PENDING";
  items: SaleItemState[];
};

type SaleInitialData = {
  id?: string;
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string | null;
  initialState?: Partial<SaleFormState>;
};

type SaleFormProps = {
  mode: "create" | "edit";
  entryId?: string;
  initialData?: SaleInitialData;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type SaleSubmitResponse = {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  itemCount?: number;
};

type SaleCompletionState = {
  id: string;
  total: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  itemCount: number;
};

const defaultState: SaleFormState = {
  accountId: "",
  financialCategoryId: "",
  customerId: "",
  orderId: "",
  quoteId: "",
  description: "",
  dueDate: new Date().toISOString().slice(0, 10),
  paymentStatus: "PAID",
  items: [],
};

function createItem(product?: ProductOption): SaleItemState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: product?.id ?? "",
    description: product?.name ?? "",
    quantity: "1",
    unitPrice: formatCurrencyValue(product?.salePrice ?? 0),
    discountAmount: "0,00",
  };
}

function buildInitialState(initialData?: SaleInitialData): SaleFormState {
  const state = initialData?.initialState;

  return {
    ...defaultState,
    ...state,
    description: state?.description ?? "",
    dueDate: state?.dueDate ?? defaultState.dueDate,
    paymentStatus:
      initialData?.status === "PAID"
        ? "PAID"
        : state?.paymentStatus ?? "PENDING",
    items: (state?.items ?? []).map((item) => ({
      id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: item.productId ?? "",
      description: item.description ?? "",
      quantity: item.quantity ?? "1",
      unitPrice: item.unitPrice ?? "0,00",
      discountAmount: item.discountAmount ?? "0,00",
    })),
  };
}

export function SaleForm({ mode, entryId, initialData }: Readonly<SaleFormProps>) {
  const router = useRouter();
  const productSearchRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<SaleFormState>(() => buildInitialState(initialData));
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<FinancialCategoryOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [settings, setSettings] = useState<OperationalSettings | null>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const deferredProductSearch = useDeferredValue(productSearch);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completion, setCompletion] = useState<SaleCompletionState | null>(null);
  const [baselineState, setBaselineState] = useState(() =>
    JSON.stringify(compactSaleState(buildInitialState(initialData))),
  );

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === "INCOME"),
    [categories],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);
      setErrorMessage(null);

      try {
        const [accountsResponse, categoriesResponse, customersResponse, ordersResponse, quotesResponse, productsResponse, groupsResponse, settingsResponse] =
          await Promise.all([
            fetch("/api/financial/accounts", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/financial/categories", { signal: controller.signal, cache: "no-store" }),
            fetch(`/api/customers${mode === "edit" ? "?includeInactive=true" : ""}`, {
              signal: controller.signal,
              cache: "no-store",
            }),
            fetch("/api/orders", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/quotes", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/inventory/products", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/inventory/groups", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/inventory/settings", { signal: controller.signal, cache: "no-store" }),
          ]);

        const accountsResult = (await accountsResponse.json()) as ApiResult<AccountOption[]>;
        const categoriesResult = (await categoriesResponse.json()) as ApiResult<FinancialCategoryOption[]>;
        const customersResult = (await customersResponse.json()) as ApiResult<CustomerOption[]>;
        const ordersResult = (await ordersResponse.json()) as ApiResult<OrderOption[]>;
        const quotesResult = (await quotesResponse.json()) as ApiResult<QuoteOption[]>;
        const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;
        const groupsResult = (await groupsResponse.json()) as ApiResult<GroupOption[]>;
        const settingsResult = (await settingsResponse.json()) as ApiResult<OperationalSettings>;

        if (!accountsResponse.ok || !accountsResult.success || !accountsResult.data) {
          throw new Error(accountsResult.message ?? "Nao foi possivel carregar as contas.");
        }

        if (!categoriesResponse.ok || !categoriesResult.success || !categoriesResult.data) {
          throw new Error(categoriesResult.message ?? "Nao foi possivel carregar as categorias.");
        }

        if (!customersResponse.ok || !customersResult.success || !customersResult.data) {
          throw new Error(customersResult.message ?? "Nao foi possivel carregar os clientes.");
        }

        if (!ordersResponse.ok || !ordersResult.success || !ordersResult.data) {
          throw new Error(ordersResult.message ?? "Nao foi possivel carregar os pedidos.");
        }

        if (!quotesResponse.ok || !quotesResult.success || !quotesResult.data) {
          throw new Error(quotesResult.message ?? "Nao foi possivel carregar os orcamentos.");
        }

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          throw new Error(productsResult.message ?? "Nao foi possivel carregar os itens.");
        }

        if (!groupsResponse.ok || !groupsResult.success || !groupsResult.data) {
          throw new Error(groupsResult.message ?? "Nao foi possivel carregar os grupos.");
        }

        if (!settingsResponse.ok || !settingsResult.success || !settingsResult.data) {
          throw new Error(settingsResult.message ?? "Nao foi possivel carregar os parametros da operacao.");
        }

        const loadedAccounts = accountsResult.data;
        const loadedCategories = categoriesResult.data;
        const loadedCustomers = customersResult.data;
        const loadedOrders = ordersResult.data;
        const loadedQuotes = quotesResult.data;
        const loadedProducts = productsResult.data;
        const loadedGroups = groupsResult.data;
        const loadedSettings = settingsResult.data;

        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setCustomers(loadedCustomers);
        setOrders(loadedOrders);
        setQuotes(loadedQuotes);
        setProducts(loadedProducts);
        setGroups(loadedGroups);
        setSettings(loadedSettings);

        setForm((current) => {
          const nextAccountId =
            current.accountId || loadedAccounts.find((account) => account.type === "CASH")?.id || loadedAccounts[0]?.id || "";
          const nextCategoryId =
            current.financialCategoryId ||
            incomeCategoriesFrom(loadedCategories).find((category) => category.isActive)?.id ||
            incomeCategoriesFrom(loadedCategories)[0]?.id ||
            "";

          const nextState = {
            ...current,
            accountId: nextAccountId,
            financialCategoryId: nextCategoryId,
          };

          setBaselineState((existingBaseline) =>
            existingBaseline === JSON.stringify(compactSaleState(current))
              ? JSON.stringify(compactSaleState(nextState))
              : existingBaseline,
          );

          return nextState;
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar os dados da venda.");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => controller.abort();
  }, [mode]);

  useEffect(() => {
    if (completion) {
      return;
    }

    productSearchRef.current?.focus();
  }, [completion]);

  const comparableState = useMemo(
    () => JSON.stringify(compactSaleState(form)),
    [form],
  );

  const { allowNextNavigation } = useUnsavedChanges(
    !completion && comparableState !== baselineState,
  );

  const selectedCategory = useMemo(
    () => incomeCategories.find((category) => category.id === form.financialCategoryId) ?? null,
    [form.financialCategoryId, incomeCategories],
  );

  const customerOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
        description:
          [customer.whatsapp, customer.email]
            .filter(Boolean)
            .join(" | ") || "Cadastro sem contato principal",
      })),
    [customers],
  );

  const accountOptions = useMemo<SearchableSelectOption[]>(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name,
        description: formatAccountType(account.type),
      })),
    [accounts],
  );

  const categoryOptions = useMemo<SearchableSelectOption[]>(
    () =>
      incomeCategories.map((category) => ({
        value: category.id,
        label: category.name,
        description: category.isActive ? "Categoria ativa" : "Categoria inativa",
      })),
    [incomeCategories],
  );

  const orderOptions = useMemo<SearchableSelectOption[]>(
    () =>
      orders.map((order) => ({
        value: order.id,
        label: `${order.code} | ${order.customerName}`,
        keywords: [order.code, order.customerName],
      })),
    [orders],
  );

  const quoteOptions = useMemo<SearchableSelectOption[]>(
    () =>
      quotes.map((quote) => ({
        value: quote.id,
        label: `${quote.code} | ${quote.customerName}`,
        keywords: [quote.code, quote.customerName],
      })),
    [quotes],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredProductSearch);

    return products
      .filter((product) => product.isActive || form.items.some((item) => item.productId === product.id))
      .filter((product) => (groupFilter ? product.categoryId === groupFilter : true))
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return normalizeSearchText(
          [
            product.name,
            product.categoryName,
            product.sku,
            product.barcode,
            formatProductType(product.type),
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [deferredProductSearch, form.items, groupFilter, products]);

  const computedItems = useMemo(
    () =>
      form.items.map((item) => {
        const product = item.productId ? productMap.get(item.productId) ?? null : null;
        const quantity = parseDecimalInput(item.quantity);
        const unitPrice = parseCurrencyInput(item.unitPrice);
        const grossTotal = roundCurrency(quantity * unitPrice);
        const discountAmount = Math.min(parseCurrencyInput(item.discountAmount), grossTotal);
        const netTotal = roundCurrency(grossTotal - discountAmount);
        const netUnitPrice = quantity > 0 ? roundCurrency(netTotal / quantity) : 0;
        const unitCost = product?.costPrice ?? 0;
        const totalCost = roundCurrency(unitCost * quantity);
        const marginPercent = netTotal > 0 ? roundCurrency(((netTotal - totalCost) / netTotal) * 100) : 0;
        const targetMargin = product?.desiredMargin ?? settings?.minimumMarginPercent ?? 0;
        const hasMarginAlert = Boolean(product) && netTotal > 0 && marginPercent < targetMargin;
        const hasStockAlert = Boolean(
          product?.controlsStock &&
            settings &&
            !settings.allowNegativeStock &&
            quantity > product.currentStock,
        );

        return {
          ...item,
          product,
          quantity,
          unitPrice,
          grossTotal,
          discountAmount,
          netTotal,
          netUnitPrice,
          totalCost,
          marginPercent,
          targetMargin,
          hasMarginAlert,
          hasStockAlert,
        };
      }),
    [form.items, productMap, settings],
  );

  const totals = useMemo(
    () => ({
      gross: roundCurrency(computedItems.reduce((sum, item) => sum + item.grossTotal, 0)),
      discount: roundCurrency(computedItems.reduce((sum, item) => sum + item.discountAmount, 0)),
      net: roundCurrency(computedItems.reduce((sum, item) => sum + item.netTotal, 0)),
      quantity: roundQuantity(computedItems.reduce((sum, item) => sum + item.quantity, 0)),
      stockAlerts: computedItems.filter((item) => item.hasStockAlert).length,
      marginAlerts: computedItems.filter((item) => item.hasMarginAlert).length,
    }),
    [computedItems],
  );

  function updateField<K extends keyof SaleFormState>(field: K, value: SaleFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(itemId: string, field: keyof SaleItemState, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  }

  function addProductToCart(product: ProductOption) {
    setForm((current) => {
      const existingItem = current.items.find((item) => item.productId === product.id);

      if (existingItem) {
        setInfoMessage(`${product.name} ja estava no carrinho. A quantidade foi aumentada.`);
        return {
          ...current,
          items: current.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: normalizeDecimalInput(String(parseDecimalInput(item.quantity) + 1)),
                }
              : item,
          ),
        };
      }

      setInfoMessage(`${product.name} adicionado ao carrinho.`);
      return {
        ...current,
        items: [...current.items, createItem(product)],
      };
    });

    setProductSearch("");
    window.setTimeout(() => setInfoMessage(null), 2500);
  }

  function addManualItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, createItem()],
    }));
  }

  function removeItem(itemId: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  function handleProductSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filteredProducts[0]) {
      event.preventDefault();
      addProductToCart(filteredProducts[0]);
    }
  }

  function validateSale() {
    if (!form.accountId) {
      return "Selecione a conta que recebera esta venda.";
    }

    if (!form.financialCategoryId) {
      return "Selecione a categoria financeira da venda.";
    }

    if (!form.dueDate) {
      return form.paymentStatus === "PAID"
        ? "Informe a data de recebimento."
        : "Informe a data prevista para receber esta venda.";
    }

    if (!computedItems.length) {
      return "Adicione pelo menos um item antes de concluir a venda.";
    }

    for (const [index, item] of computedItems.entries()) {
      if (!item.productId && item.description.trim().length < 2) {
        return `Informe a descricao do item ${index + 1}.`;
      }

      if (item.quantity <= 0) {
        return `Informe uma quantidade valida para o item ${index + 1}.`;
      }

      if (item.unitPrice < 0) {
        return `Informe um preco valido para o item ${index + 1}.`;
      }

      if (item.discountAmount < 0 || item.discountAmount > item.grossTotal) {
        return `Revise o desconto do item ${index + 1}.`;
      }

      if (item.hasStockAlert) {
        return `Nao ha saldo suficiente para ${item.product?.name ?? `o item ${index + 1}`}. Ajuste a quantidade ou libere estoque negativo nos parametros.`;
      }
    }

    if (totals.net <= 0) {
      return "A venda precisa ter valor liquido maior que zero.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateSale();

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
        accountId: form.accountId,
        financialCategoryId: form.financialCategoryId,
        customerId: form.customerId || undefined,
        orderId: form.orderId || undefined,
        quoteId: form.quoteId || undefined,
        entryType: "INCOME" as const,
        category: selectedCategory?.name ?? "Venda",
        description: form.description.trim() || undefined,
        amount: totals.net,
        dueDate: form.dueDate,
        status: form.paymentStatus,
        paidAt: form.paymentStatus === "PAID" ? form.dueDate : undefined,
        items: computedItems.map((item) => ({
          productId: item.productId || undefined,
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.netUnitPrice,
        })),
      };

      const endpoint = mode === "create" ? "/api/financial/entries" : `/api/financial/entries/${entryId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResult<SaleSubmitResponse>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel concluir a venda.");
        return;
      }

      if (mode === "create") {
        setCompletion({
          id: result.data.id,
          total: totals.net,
          status: result.data.status,
          itemCount: computedItems.length,
        });
        allowNextNavigation();
        return;
      }

      setBaselineState(JSON.stringify(compactSaleState(form)));
      setSuccessMessage("Venda atualizada com sucesso.");
      allowNextNavigation();
    } catch {
      setErrorMessage("Falha ao comunicar com o servidor. Revise a conexao e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCustomerCreated(customer: CustomerOption) {
    setCustomers((current) => [...current, customer].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((current) => ({
      ...current,
      customerId: customer.id,
    }));
    setShowQuickCustomer(false);
    setInfoMessage(`${customer.name} foi cadastrado e ja ficou vinculado a esta venda.`);
    window.setTimeout(() => setInfoMessage(null), 2500);
  }

  function startNewSale() {
    allowNextNavigation();
    router.replace("/admin/vendas/novo");
    router.refresh();
  }

  if (completion) {
    return (
      <SectionCard title="Venda concluida" description="A operacao foi registrada com sucesso e ja esta disponivel na lista de vendas.">
        <div className="admin-page-stack">
          <Alert variant="success" title="Venda concluida com sucesso.">
            O financeiro foi atualizado e os itens desta venda ficaram registrados no historico comercial.
          </Alert>

          <div className="admin-card-grid">
            <MetricTile label="Referencia" value={completion.id.slice(0, 8).toUpperCase()} />
            <MetricTile label="Total" value={formatCurrency(completion.total)} />
            <MetricTile label="Situacao financeira" value={completion.status === "PAID" ? "Recebida" : "A receber"} />
            <MetricTile label="Itens" value={String(completion.itemCount)} />
          </div>

          <div className="admin-row">
            <Link href={`/admin/vendas/${completion.id}`} className="admin-button admin-button--primary">
              Abrir venda
            </Link>
            <button type="button" className="admin-button admin-button--secondary" onClick={startNewSale}>
              Registrar nova venda
            </button>
            <Link href="/admin/vendas" className="admin-button admin-button--secondary">
              Voltar a lista
            </Link>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="admin-page-stack admin-page-shell admin-page-shell--wide">
      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel salvar a venda.">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {infoMessage ? <Alert variant="info">{infoMessage}</Alert> : null}

      <div className="admin-layout-grid admin-layout-grid--sidebar">
        <div className="admin-page-stack">
          <SectionCard
            title="Adicionar itens"
            description="Pesquise por nome, SKU ou EAN. Pressione Enter para incluir o primeiro item da lista."
          >
            <div className="admin-page-stack">
              <div className="admin-form-grid admin-form-grid--2">
                <Field label="Buscar item">
                  <input
                    ref={productSearchRef}
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    onKeyDown={handleProductSearchKeyDown}
                    className="admin-input"
                    placeholder="Nome, SKU ou EAN/GTIN"
                    autoFocus
                  />
                </Field>

                <Field label="Grupo">
                  <select
                    className="admin-select"
                    value={groupFilter}
                    onChange={(event) => setGroupFilter(event.target.value)}
                  >
                    <option value="">Todos os grupos</option>
                    {groups
                      .filter((group) => group.active)
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>

              {filteredProducts.length === 0 ? (
                <EmptyState
                  title="Nenhum item encontrado"
                  description="Ajuste a busca ou o grupo para localizar um item do catalogo."
                />
              ) : (
                <div className="admin-list-stack">
                  {filteredProducts.map((product) => {
                    const stockStatus =
                      product.controlsStock && product.currentStock <= 0
                        ? "Sem saldo"
                        : product.controlsStock
                          ? `${formatNumber(product.currentStock)} ${product.unit} em estoque`
                          : "Servico sem controle de estoque";

                    return (
                      <article key={product.id} className="admin-list-card">
                        <div className="admin-list-card__header">
                          <div className="admin-list-card__heading">
                            <strong className="admin-list-card__title">{product.name}</strong>
                            <span className="admin-list-card__subtitle">
                              {[product.categoryName, product.sku, product.barcode].filter(Boolean).join(" | ") || "Item sem identificadores adicionais"}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => addProductToCart(product)}
                          >
                            Adicionar
                          </button>
                        </div>

                        <div className="admin-list-card__meta">
                          <MetricTile compact label="Tipo" value={formatProductType(product.type)} />
                          <MetricTile compact label="Preco" value={formatCurrency(product.salePrice)} />
                          <MetricTile compact label="Saldo" value={stockStatus} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Carrinho"
            description="Mantenha no foco apenas quantidade, preco, desconto e subtotal. Os alertas tecnicos aparecem somente quando importam."
            actions={
              <button type="button" className="admin-link-button" onClick={addManualItem}>
                Adicionar item livre
              </button>
            }
          >
            {computedItems.length === 0 ? (
              <EmptyState
                title="Nenhum item adicionado"
                description="Inclua um item do catalogo para iniciar a venda."
              />
            ) : (
              <div className="admin-list-stack">
                {computedItems.map((item, index) => (
                  <article key={item.id} className="admin-list-card">
                    <div className="admin-list-card__header">
                      <div className="admin-list-card__heading">
                        <strong className="admin-list-card__title">
                          {item.description || `Item ${index + 1}`}
                        </strong>
                        <span className="admin-list-card__subtitle">
                          {item.product?.categoryName ?? "Item livre"}
                          {item.product?.controlsStock ? ` | Saldo atual ${formatNumber(item.product.currentStock)} ${item.product.unit}` : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-button admin-button--danger"
                        onClick={() => removeItem(item.id)}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="admin-form-grid admin-form-grid--4">
                      <Field label="Quantidade" required>
                        <input
                          value={item.quantity}
                          onChange={(event) => updateItem(item.id, "quantity", normalizeDecimalInput(event.target.value))}
                          className="admin-input"
                          inputMode="decimal"
                        />
                      </Field>

                      <Field label="Preco aplicado" required>
                        <input
                          value={item.unitPrice}
                          onChange={(event) => updateItem(item.id, "unitPrice", formatCurrencyInput(event.target.value))}
                          className="admin-input"
                          inputMode="numeric"
                        />
                      </Field>

                      <Field label="Desconto">
                        <input
                          value={item.discountAmount}
                          onChange={(event) => updateItem(item.id, "discountAmount", formatCurrencyInput(event.target.value))}
                          className="admin-input"
                          inputMode="numeric"
                        />
                      </Field>

                      <Field label="Subtotal">
                        <div className="admin-readonly-box admin-readonly-box--emphasis">
                          {formatCurrency(item.netTotal)}
                        </div>
                      </Field>
                    </div>

                    {!item.productId ? (
                      <Field label="Descricao do item" required>
                        <input
                          value={item.description}
                          onChange={(event) => updateItem(item.id, "description", event.target.value)}
                          className="admin-input"
                          placeholder="Descreva o item vendido"
                        />
                      </Field>
                    ) : null}

                    {item.hasStockAlert || item.hasMarginAlert ? (
                      <div className="admin-page-stack">
                        {item.hasStockAlert ? (
                          <Alert variant="warning" title="Saldo insuficiente para esta quantidade.">
                            Revise a quantidade ou permita estoque negativo nos parametros antes de concluir esta venda.
                          </Alert>
                        ) : null}
                        {item.hasMarginAlert ? (
                          <Alert variant="warning" title="Margem estimada abaixo do minimo configurado.">
                            Esta linha ficara com margem estimada de {formatPercent(item.marginPercent)} frente ao minimo de {formatPercent(item.targetMargin)}.
                          </Alert>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="admin-page-stack">
          <SectionCard title="Cliente e recebimento" description="Defina quem esta comprando e como a venda entrara no financeiro.">
            <div className="admin-page-stack">
              <div className="admin-form-grid admin-form-grid--2">
                <Field label="Conta financeira" required>
                  <SearchableSelect
                    value={form.accountId}
                    onChange={(value) => updateField("accountId", value)}
                    options={accountOptions}
                    placeholder="Selecionar conta"
                    disabled={isLoadingOptions}
                  />
                </Field>

                <Field label="Categoria financeira" required>
                  <SearchableSelect
                    value={form.financialCategoryId}
                    onChange={(value) => updateField("financialCategoryId", value)}
                    options={categoryOptions}
                    placeholder="Selecionar categoria"
                    disabled={isLoadingOptions}
                  />
                </Field>

                <Field label="Cliente" optional helpText="Deixe em branco para usar consumidor nao identificado.">
                  <SearchableSelect
                    value={form.customerId}
                    onChange={(value) => updateField("customerId", value)}
                    options={customerOptions}
                    placeholder="Pesquisar cliente"
                    disabled={isLoadingOptions}
                    clearable
                  />
                </Field>

                <Field label="Situacao financeira">
                  <select
                    className="admin-select"
                    value={form.paymentStatus}
                    onChange={(event) =>
                      updateField("paymentStatus", event.target.value as SaleFormState["paymentStatus"])
                    }
                  >
                    <option value="PAID">Recebida agora</option>
                    <option value="PENDING">Receber depois</option>
                  </select>
                </Field>

                <Field
                  label={form.paymentStatus === "PAID" ? "Data do recebimento" : "Primeiro vencimento"}
                  required
                >
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => updateField("dueDate", event.target.value)}
                    className="admin-input"
                  />
                </Field>
              </div>

              <div className="admin-row admin-row--between">
                <span className="admin-list-card__subtitle">
                  {form.customerId
                    ? `Cliente selecionado: ${customers.find((customer) => customer.id === form.customerId)?.name ?? "Cliente"}`
                    : "Consumidor nao identificado"}
                </span>
                <button
                  type="button"
                  className="admin-link-button"
                  onClick={() => setShowQuickCustomer((current) => !current)}
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
          </SectionCard>

          <FormSection title="Vinculos e observacoes" description="Use apenas quando esta venda nascer de um pedido, orcamento ou precisar de uma observacao operacional." defaultOpen={mode === "edit"}>
            <div className="admin-page-stack">
              <div className="admin-form-grid admin-form-grid--2">
                <Field label="Pedido relacionado" optional>
                  <SearchableSelect
                    value={form.orderId}
                    onChange={(value) => updateField("orderId", value)}
                    options={orderOptions}
                    placeholder="Selecionar pedido"
                    disabled={isLoadingOptions}
                    clearable
                  />
                </Field>

                <Field label="Orcamento relacionado" optional>
                  <SearchableSelect
                    value={form.quoteId}
                    onChange={(value) => updateField("quoteId", value)}
                    options={quoteOptions}
                    placeholder="Selecionar orcamento"
                    disabled={isLoadingOptions}
                    clearable
                  />
                </Field>
              </div>

              <Field label="Observacao adicional" optional>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className="admin-textarea"
                />
              </Field>
            </div>
          </FormSection>

          <SectionCard title="Revisao da venda" description="Confira total, descontos e alertas antes de concluir.">
            <div className="admin-summary-list">
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Itens</span>
                <strong>{computedItems.length}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Quantidade total</span>
                <strong>{formatNumber(totals.quantity)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Valor bruto</span>
                <strong>{formatCurrency(totals.gross)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Desconto</span>
                <strong>{formatCurrency(totals.discount)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>Total</span>
                <strong style={{ fontSize: 24 }}>{formatCurrency(totals.net)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Situacao</span>
                <StatusBadge
                  status={form.paymentStatus === "PAID" ? "Recebida" : "A receber"}
                  tone={form.paymentStatus === "PAID" ? "success" : "warning"}
                />
              </div>
            </div>

            {totals.stockAlerts || totals.marginAlerts ? (
              <div className="admin-page-stack" style={{ marginTop: 12 }}>
                {totals.stockAlerts ? (
                  <Alert variant="warning" title={`${totals.stockAlerts} item(ns) com alerta de estoque.`}>
                    Revise as quantidades antes de concluir. O sistema nao deve seguir com saldo insuficiente quando o estoque negativo estiver bloqueado.
                  </Alert>
                ) : null}
                {totals.marginAlerts ? (
                  <Alert variant="warning" title={`${totals.marginAlerts} item(ns) com alerta de margem.`}>
                    O valor liquido de uma ou mais linhas ficou abaixo da margem minima configurada.
                  </Alert>
                ) : null}
              </div>
            ) : (
              <Alert variant="info" title="Pronto para concluir">
                O resumo da venda esta consistente. Revise apenas se precisar ajustar cliente, observacao ou vencimento.
              </Alert>
            )}
          </SectionCard>
        </div>
      </div>

      <StickyActionBar>
        <div className="admin-row">
          <Link href="/admin/vendas" className="admin-button admin-button--secondary">
            Voltar para vendas
          </Link>
        </div>

        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          loadingLabel={mode === "create" ? "Concluindo venda..." : "Salvando venda..."}
          className="admin-button admin-button--primary"
          disabled={isLoadingOptions}
        >
          {mode === "create" ? "Concluir venda" : "Salvar alteracoes"}
        </LoadingButton>
      </StickyActionBar>
    </form>
  );
}

function incomeCategoriesFrom(categories: FinancialCategoryOption[]) {
  return categories.filter((category) => category.type === "INCOME");
}

function compactSaleState(state: SaleFormState) {
  return {
    accountId: state.accountId,
    financialCategoryId: state.financialCategoryId,
    customerId: state.customerId,
    orderId: state.orderId,
    quoteId: state.quoteId,
    description: state.description.trim(),
    dueDate: state.dueDate,
    paymentStatus: state.paymentStatus,
    items: state.items.map((item) => ({
      productId: item.productId,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
    })),
  };
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatProductType(type: string) {
  const labels: Record<string, string> = {
    RAW_MATERIAL: "Materia-prima",
    FINISHED_PRODUCT: "Produto final",
    SERVICE: "Servico",
    RESALE: "Revenda",
  };

  return labels[type] ?? type;
}

function formatAccountType(type: string) {
  const labels: Record<string, string> = {
    CASH: "Caixa",
    BANK: "Banco",
    DIGITAL_WALLET: "Carteira digital",
  };

  return labels[type] ?? type;
}

function MetricTile({
  label,
  value,
  compact = false,
}: Readonly<{ label: string; value: string; compact?: boolean }>) {
  return (
    <div className="admin-surface-muted" style={compact ? { padding: "8px 10px" } : undefined}>
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
