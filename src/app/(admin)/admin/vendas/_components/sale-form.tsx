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
  Skeleton,
  StatusBadge,
  StickyActionBar,
} from "@/components/admin/ui";
import { QuickCustomerPanel } from "@/components/forms/quick-customer-panel";
import { MoneyInput, QuantityInput } from "@/components/forms/number-inputs";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import {
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

type OrderPrefillDetail = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
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
  availableStock: number;
  hasStockMismatch: boolean;
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
  prefillOrderId?: string | null;
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
  stockUpdated: boolean;
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

export function SaleForm({ mode, entryId, initialData, prefillOrderId }: Readonly<SaleFormProps>) {
  const router = useRouter();
  const productSearchRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<SaleFormState>(() => buildInitialState(initialData));
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<FinancialCategoryOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [productCatalog, setProductCatalog] = useState<ProductOption[]>([]);
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [settings, setSettings] = useState<OperationalSettings | null>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const deferredProductSearch = useDeferredValue(productSearch);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isHydratingOrder, setIsHydratingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<SaleCompletionState | null>(null);
  const [hydratedOrderId, setHydratedOrderId] = useState<string | null>(null);
  const [baselineState, setBaselineState] = useState(() =>
    JSON.stringify(compactSaleState(buildInitialState(initialData))),
  );

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === "INCOME"),
    [categories],
  );

  function mergeProductCatalog(nextProducts: ProductOption[]) {
    setProductCatalog((current) => {
      const productMap = new Map(current.map((product) => [product.id, product]));
      for (const product of nextProducts) {
        productMap.set(product.id, product);
      }

      return [...productMap.values()];
    });
  }

  const productMap = useMemo(
    () => new Map(productCatalog.map((product) => [product.id, product])),
    [productCatalog],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);
      setErrorMessage(null);

      try {
        const [accountsResponse, categoriesResponse, customersResponse, ordersResponse, quotesResponse, groupsResponse, settingsResponse] =
          await Promise.all([
            fetch("/api/financial/accounts", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/financial/categories", { signal: controller.signal, cache: "no-store" }),
            fetch(`/api/customers${mode === "edit" ? "?includeInactive=true" : ""}`, {
              signal: controller.signal,
              cache: "no-store",
            }),
            fetch("/api/orders", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/quotes", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/inventory/groups", { signal: controller.signal, cache: "no-store" }),
            fetch("/api/inventory/settings", { signal: controller.signal, cache: "no-store" }),
          ]);

        const accountsResult = (await accountsResponse.json()) as ApiResult<AccountOption[]>;
        const categoriesResult = (await categoriesResponse.json()) as ApiResult<FinancialCategoryOption[]>;
        const customersResult = (await customersResponse.json()) as ApiResult<CustomerOption[]>;
        const ordersResult = (await ordersResponse.json()) as ApiResult<OrderOption[]>;
        const quotesResult = (await quotesResponse.json()) as ApiResult<QuoteOption[]>;
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
        const loadedGroups = groupsResult.data;
        const loadedSettings = settingsResult.data;

        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setCustomers(loadedCustomers);
        setOrders(loadedOrders);
        setQuotes(loadedQuotes);
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
    if (mode !== "create" || !prefillOrderId || form.orderId || isLoadingOptions) {
      return;
    }

    setForm((current) => ({
      ...current,
      orderId: prefillOrderId,
    }));
  }, [form.orderId, isLoadingOptions, mode, prefillOrderId]);

  useEffect(() => {
    if (completion) {
      return;
    }

    productSearchRef.current?.focus();
  }, [completion]);

  useEffect(() => {
    if (mode !== "create" || !form.orderId || hydratedOrderId === form.orderId) {
      return;
    }

    const controller = new AbortController();

    async function hydrateFromOrder() {
      setIsHydratingOrder(true);

      try {
        const response = await fetch(`/api/orders/${form.orderId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<OrderPrefillDetail>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Nao foi possivel carregar o pedido para faturamento.");
        }

        const nextOrder = result.data;
        setForm((current) => {
          const canReplaceItems =
            current.items.length === 0 ||
            current.items.every(
              (item) =>
                !item.productId &&
                !item.description.trim() &&
                parseDecimalInput(item.quantity) <= 1 &&
                parseCurrencyInput(item.unitPrice) <= 0,
            );

          return {
            ...current,
            customerId: current.customerId || nextOrder.customerId,
            orderId: nextOrder.id,
            description:
              current.description.trim() || `Faturamento do pedido ${nextOrder.code}`,
            items: canReplaceItems
              ? nextOrder.items.map((item) => ({
                  id: item.id,
                  productId: item.productId ?? "",
                  description: item.description,
                  quantity: normalizeDecimalInput(String(item.quantity)),
                  unitPrice: formatCurrencyValue(item.unitPrice),
                  discountAmount: "0,00",
                }))
              : current.items,
          };
        });
        setInfoMessage(`Pedido ${nextOrder.code} reaproveitado para o faturamento desta venda.`);
        setHydratedOrderId(nextOrder.id);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel reaproveitar o pedido para a venda.",
        );
      } finally {
        setIsHydratingOrder(false);
      }
    }

    void hydrateFromOrder();

    return () => controller.abort();
  }, [form.orderId, hydratedOrderId, mode]);

  useEffect(() => {
    const productIds = [...new Set(form.items.map((item) => item.productId).filter(Boolean))];
    const missingProductIds = productIds.filter((productId) => !productMap.has(productId));

    if (!missingProductIds.length) {
      return;
    }

    const controller = new AbortController();

    async function loadMissingProducts() {
      try {
        const responses = await Promise.all(
          missingProductIds.map((productId) =>
            fetch(`/api/inventory/products/${productId}`, {
              signal: controller.signal,
              cache: "no-store",
            }),
          ),
        );
        const results = (await Promise.all(
          responses.map((response) => response.json()),
        )) as Array<ApiResult<ProductOption>>;
        const loadedProducts = results
          .filter((result, index) => responses[index].ok && result.success && result.data)
          .map((result) => result.data as ProductOption);

        if (loadedProducts.length) {
          mergeProductCatalog(loadedProducts);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    void loadMissingProducts();

    return () => controller.abort();
  }, [form.items, productMap]);

  useEffect(() => {
    const normalizedQuery = deferredProductSearch.trim();
    const shouldSearch = normalizedQuery.length >= 2 || Boolean(groupFilter);

    if (!shouldSearch) {
      setProductResults([]);
      setProductSearchError(null);
      setIsLoadingProducts(false);
      return;
    }

    const controller = new AbortController();

    async function searchProducts() {
      setIsLoadingProducts(true);
      setProductSearchError(null);

      try {
        const params = new URLSearchParams();
        params.set("onlyActive", "true");
        params.set("limit", "12");
        if (normalizedQuery.length >= 2) {
          params.set("search", normalizedQuery);
        }
        if (groupFilter) {
          params.set("categoryId", groupFilter);
        }

        const response = await fetch(`/api/inventory/products?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<ProductOption[]>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Nao foi possivel pesquisar os itens.");
        }

        setProductResults(result.data);
        mergeProductCatalog(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setProductResults([]);
        setProductSearchError(
          error instanceof Error ? error.message : "Falha ao pesquisar os itens para a venda.",
        );
      } finally {
        setIsLoadingProducts(false);
      }
    }

    const timeout = window.setTimeout(searchProducts, normalizedQuery.length >= 2 ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [deferredProductSearch, groupFilter]);

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
  const selectedCustomerName = useMemo(
    () => customers.find((customer) => customer.id === form.customerId)?.name ?? null,
    [customers, form.customerId],
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === form.orderId) ?? null,
    [form.orderId, orders],
  );
  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === form.quoteId) ?? null,
    [form.quoteId, quotes],
  );
  const saleOriginLabel = selectedOrder
    ? `Pedido ${selectedOrder.code}`
    : selectedQuote
      ? `Orcamento ${selectedQuote.code}`
      : "Venda direta";

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

  const filteredProducts = useMemo(
    () =>
      productResults.filter(
        (product) => product.isActive || form.items.some((item) => item.productId === product.id),
      ),
    [form.items, productResults],
  );
  const hasProductSearchCriteria = deferredProductSearch.trim().length >= 2 || Boolean(groupFilter);

  const computedItems = useMemo(
    () =>
      form.items.map((item) => {
        const product = item.productId ? productMap.get(item.productId) ?? null : null;
        const parsedQuantity = parseDecimalInput(item.quantity);
        const parsedUnitPrice = parseCurrencyInput(item.unitPrice);
        const grossTotal = roundCurrency(parsedQuantity * parsedUnitPrice);
        const parsedDiscountAmount = Math.min(parseCurrencyInput(item.discountAmount), grossTotal);
        const netTotal = roundCurrency(grossTotal - parsedDiscountAmount);
        const netUnitPrice = parsedQuantity > 0 ? roundCurrency(netTotal / parsedQuantity) : 0;
        const unitCost = product?.costPrice ?? 0;
        const totalCost = roundCurrency(unitCost * parsedQuantity);
        const marginPercent = netTotal > 0 ? roundCurrency(((netTotal - totalCost) / netTotal) * 100) : 0;
        const targetMargin = product?.desiredMargin ?? settings?.minimumMarginPercent ?? 0;
        const hasMarginAlert = Boolean(product) && netTotal > 0 && marginPercent < targetMargin;
        const hasStockAlert = Boolean(
          product?.controlsStock &&
            settings &&
            !settings.allowNegativeStock &&
            parsedQuantity > product.availableStock,
        );

        return {
          ...item,
          product,
          parsedQuantity,
          parsedUnitPrice,
          grossTotal,
          parsedDiscountAmount,
          netTotal,
          netUnitPrice,
          totalCost,
          marginPercent,
          targetMargin,
          hasMarginAlert,
          hasStockAlert,
          availableStock: product?.availableStock ?? product?.currentStock ?? 0,
          hasStockMismatch: product?.hasStockMismatch ?? false,
        };
      }),
    [form.items, productMap, settings],
  );

  const totals = useMemo(
    () => ({
      gross: roundCurrency(computedItems.reduce((sum, item) => sum + item.grossTotal, 0)),
      discount: roundCurrency(computedItems.reduce((sum, item) => sum + item.parsedDiscountAmount, 0)),
      net: roundCurrency(computedItems.reduce((sum, item) => sum + item.netTotal, 0)),
      quantity: roundQuantity(computedItems.reduce((sum, item) => sum + item.parsedQuantity, 0)),
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

      if (item.parsedQuantity <= 0) {
        return `Informe uma quantidade valida para o item ${index + 1}.`;
      }

      if (item.parsedUnitPrice < 0) {
        return `Informe um preco valido para o item ${index + 1}.`;
      }

      if (item.parsedDiscountAmount < 0 || item.parsedDiscountAmount > item.grossTotal) {
        return `Revise o desconto do item ${index + 1}.`;
      }

      if (item.hasStockAlert) {
        return `O item ${item.product?.name ?? `#${index + 1}`} possui ${formatNumber(item.availableStock)} ${item.product?.unit ?? ""} disponivel(is) pelo controle FIFO, mas a venda solicita ${formatNumber(item.parsedQuantity)}. Revise o estoque ou reduza a quantidade.`;
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
          quantity: item.parsedQuantity,
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
          stockUpdated: computedItems.some((item) => item.product?.controlsStock),
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
            {completion.stockUpdated
              ? completion.status === "PAID"
                ? "O financeiro foi registrado como recebido no ato e o estoque dos itens fisicos ja foi refletido nesta venda."
                : "O financeiro foi atualizado, a conta a receber ficou pendente e o estoque dos itens fisicos ja foi refletido nesta venda."
              : completion.status === "PAID"
                ? "O financeiro foi registrado como recebido no ato e os itens desta venda ficaram gravados no historico comercial."
                : "O financeiro foi atualizado e os itens desta venda ficaram registrados no historico comercial."}
          </Alert>

          <div className="admin-card-grid">
            <MetricTile label="Referencia" value={completion.id.slice(0, 8).toUpperCase()} />
            <MetricTile label="Total" value={formatCurrency(completion.total)} />
            <MetricTile label="Situacao financeira" value={completion.status === "PAID" ? "Recebida" : "A receber"} />
            <MetricTile label="Itens" value={String(completion.itemCount)} />
          </div>

          <SectionCard
            title="Financeiro"
            description={
              completion.status === "PAID"
                ? "O registro financeiro ficou baixado no mesmo momento da venda."
                : "A venda ja ficou ligada ao contas a receber para acompanhamento do vencimento e da baixa."
            }
          >
            <div className="admin-summary-list">
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>
                  {completion.status === "PAID" ? "Registro financeiro" : "Conta a receber criada"}
                </span>
                <strong>{completion.status === "PAID" ? "Recebida" : "Pendente"}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Vencimento</span>
                <strong>{new Intl.DateTimeFormat("pt-BR").format(new Date(form.dueDate))}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Valor</span>
                <strong>{formatCurrency(completion.total)}</strong>
              </div>
            </div>
          </SectionCard>

          <div className="admin-row">
            <Link href={`/admin/vendas/${completion.id}`} className="admin-button admin-button--primary">
              Abrir venda
            </Link>
            <Link href={`/admin/financeiro/lancamentos/${completion.id}`} className="admin-button admin-button--secondary">
              {completion.status === "PAID" ? "Abrir financeiro" : "Abrir conta a receber"}
            </Link>
            {form.orderId ? (
              <Link href={`/admin/pedidos/${form.orderId}`} className="admin-button admin-button--secondary">
                Voltar para pedido
              </Link>
            ) : null}
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
      {isHydratingOrder ? (
        <Alert variant="info" title="Preparando faturamento do pedido.">
          Estamos reaproveitando cliente e itens do pedido selecionado para acelerar esta venda.
        </Alert>
      ) : null}

      <SectionCard
        title="Cliente e contexto"
        description="Defina quem esta comprando, confirme a origem da operacao e siga para os itens."
      >
        <div className="admin-layout-grid admin-layout-grid--split">
          <div className="admin-page-stack">
            <Field
              label="Cliente"
              optional
              helpText="Deixe em branco para usar consumidor nao identificado."
            >
              <SearchableSelect
                value={form.customerId}
                onChange={(value) => updateField("customerId", value)}
                options={customerOptions}
                placeholder="Pesquisar cliente"
                disabled={isLoadingOptions || Boolean(form.orderId)}
                clearable
                inputName="saleCustomerSearch"
              />
            </Field>

            <div className="admin-row admin-row--between">
              <span className="admin-list-card__subtitle">
                {form.customerId
                  ? `Cliente selecionado: ${selectedCustomerName ?? "Cliente"}`
                  : "Consumidor nao identificado"}
              </span>
              <div className="admin-row">
                {form.customerId ? (
                  <button
                    type="button"
                    className="admin-link-button"
                    onClick={() => updateField("customerId", "")}
                  >
                    Usar consumidor nao identificado
                  </button>
                ) : null}
                {!form.orderId ? (
                  <button
                    type="button"
                    className="admin-link-button"
                    onClick={() => setShowQuickCustomer((current) => !current)}
                  >
                    {showQuickCustomer ? "Fechar cadastro rapido" : "Cadastrar cliente rapido"}
                  </button>
                ) : null}
              </div>
            </div>

            {showQuickCustomer ? (
              <QuickCustomerPanel
                onCreated={handleCustomerCreated}
                onCancel={() => setShowQuickCustomer(false)}
              />
            ) : null}
          </div>

          <div className="admin-page-stack">
            <div className="admin-card-grid admin-card-grid--compact">
              <MetricTile label="Origem" value={saleOriginLabel} />
              <MetricTile
                label="Financeiro"
                value={form.paymentStatus === "PAID" ? "Recebida agora" : "Conta a receber"}
              />
              <MetricTile
                label="Status"
                value={mode === "create" ? "Em revisao" : "Venda registrada"}
              />
            </div>

            {form.orderId ? (
              <Alert variant="info" title="Venda ligada a um pedido entregue.">
                Este fluxo segue disponivel para revisao, mas o faturamento direto do pedido agora pode ser feito sem abrir esta tela.
              </Alert>
            ) : (
              <Alert variant="info" title="Fluxo da venda">
                Selecione cliente, pesquise itens, revise o carrinho e conclua o pagamento em um unico bloco lateral.
              </Alert>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="admin-layout-grid admin-layout-grid--sale">
        <div className="admin-page-stack">
          <SectionCard
            title="Buscar e adicionar itens"
            description="Busque por nome, SKU ou EAN/GTIN. O catalogo so aparece quando voce pesquisa ou escolhe um grupo."
          >
            <div className="admin-page-stack">
              <div className="admin-form-grid admin-form-grid--2">
                <Field label="Buscar item">
                  <input
                    ref={productSearchRef}
                    type="search"
                    name="catalogItemSearch"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="search"
                    aria-label="Pesquisar item do catalogo para venda"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    onKeyDown={handleProductSearchKeyDown}
                    className="admin-input"
                    placeholder="Digite pelo menos 2 caracteres"
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

              {productSearchError ? (
                <Alert variant="danger" title="Nao foi possivel pesquisar os itens.">
                  {productSearchError}
                </Alert>
              ) : null}

              {!hasProductSearchCriteria ? (
                <EmptyState
                  title="Comece pela pesquisa"
                  description="Digite pelo menos 2 caracteres ou escolha um grupo para carregar somente os itens relevantes para esta venda."
                />
              ) : isLoadingProducts ? (
                <Skeleton lines={6} />
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  title="Nenhum item encontrado"
                  description="Ajuste a busca ou o grupo para localizar um item do catalogo."
                />
              ) : (
                <div className="admin-list-stack">
                  {filteredProducts.map((product) => {
                    const stockStatus =
                      product.controlsStock && product.availableStock <= 0
                        ? "Sem saldo vendavel"
                        : product.controlsStock
                          ? `${formatNumber(product.availableStock)} ${product.unit} disponivel(is)`
                          : "Servico sem controle de estoque";

                    return (
                      <article key={product.id} className="admin-list-card">
                        <div className="admin-list-card__header">
                          <div className="admin-list-card__heading">
                            <strong className="admin-list-card__title">{product.name}</strong>
                            <span className="admin-list-card__subtitle">
                              {[product.categoryName, product.sku, product.barcode].filter(Boolean).join(" | ") ||
                                "Item sem identificadores adicionais"}
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
                          <MetricTile compact label="Preco" value={formatCurrency(product.salePrice)} />
                          <MetricTile compact label="Saldo vendavel" value={stockStatus} />
                          <MetricTile compact label="Tipo" value={formatProductType(product.type)} />
                        </div>

                        {product.hasStockMismatch ? (
                          <Alert variant="warning" title="Saldo regularizavel">
                            O saldo exibido nesta venda segue o FIFO disponivel. O saldo registrado do item ainda precisa de conciliacao administrativa.
                          </Alert>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="admin-page-stack admin-sticky-panel">
          <SectionCard
            title="Carrinho"
            description="Quantidade, desconto e subtotal ficam visiveis durante toda a venda."
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
                          {item.product?.controlsStock
                            ? ` | Saldo FIFO ${formatNumber(item.availableStock)} ${item.product.unit}`
                            : ""}
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

                    <div className="admin-form-grid admin-form-grid--2">
                      <Field label="Quantidade" required>
                        <QuantityInput
                          value={item.quantity}
                          onChange={(value) => updateItem(item.id, "quantity", value)}
                          className="admin-input"
                          placeholder="1"
                        />
                      </Field>

                      <Field label={item.productId ? "Preco de tabela" : "Preco unitario"} required>
                        {item.productId ? (
                          <div className="admin-readonly-box">{formatCurrency(item.parsedUnitPrice)}</div>
                        ) : (
                          <MoneyInput
                            value={item.unitPrice}
                            onChange={(value) => updateItem(item.id, "unitPrice", value)}
                            className="admin-input"
                            placeholder="0,00"
                          />
                        )}
                      </Field>

                      <Field label="Desconto">
                        <MoneyInput
                          value={item.discountAmount}
                          onChange={(value) => updateItem(item.id, "discountAmount", value)}
                          className="admin-input"
                          placeholder="0,00"
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
                    ) : (
                      <div className="admin-list-card__meta">
                        <MetricTile compact label="Preco original" value={formatCurrency(item.parsedUnitPrice)} />
                        <MetricTile compact label="Preco liquido" value={formatCurrency(item.netUnitPrice)} />
                        <MetricTile compact label="Margem estimada" value={formatPercent(item.marginPercent)} />
                      </div>
                    )}

                    {item.hasStockAlert || item.hasMarginAlert || item.hasStockMismatch ? (
                      <div className="admin-page-stack">
                        {item.hasStockAlert ? (
                          <Alert variant="warning" title="Saldo insuficiente para esta quantidade.">
                            O item possui {formatNumber(item.availableStock)} {item.product?.unit ?? ""} disponivel(is) para venda, mas esta linha solicita {formatNumber(item.parsedQuantity)}.
                          </Alert>
                        ) : null}
                        {item.hasMarginAlert ? (
                          <Alert variant="warning" title="Margem estimada abaixo do minimo configurado.">
                            Esta linha ficara com margem estimada de {formatPercent(item.marginPercent)} frente ao minimo de {formatPercent(item.targetMargin)}.
                          </Alert>
                        ) : null}
                        {item.hasStockMismatch ? (
                          <Alert variant="info" title="Saldo exibido pela venda usa o FIFO.">
                            Este item possui divergencia entre saldo registrado e camadas disponiveis. A venda esta considerando apenas o saldo realmente elegivel para consumo.
                          </Alert>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Pagamento e fechamento" description="Escolha como esta venda entra no financeiro e conclua sem sair da lateral.">
            <div className="admin-page-stack">
              <div className="admin-tabs" role="tablist" aria-label="Condicao de pagamento">
                <button
                  type="button"
                  className={`admin-tabs__tab ${form.paymentStatus === "PAID" ? "is-active" : ""}`}
                  onClick={() => updateField("paymentStatus", "PAID")}
                >
                  Receber agora
                </button>
                <button
                  type="button"
                  className={`admin-tabs__tab ${form.paymentStatus === "PENDING" ? "is-active" : ""}`}
                  onClick={() => updateField("paymentStatus", "PENDING")}
                >
                  Receber depois
                </button>
              </div>

              <div className="admin-form-grid admin-form-grid--2">
                <Field label="Conta financeira" required>
                  <SearchableSelect
                    value={form.accountId}
                    onChange={(value) => updateField("accountId", value)}
                    options={accountOptions}
                    placeholder="Selecionar conta"
                    disabled={isLoadingOptions}
                    inputName="saleAccountSearch"
                  />
                </Field>

                <Field label="Categoria financeira" required>
                  <SearchableSelect
                    value={form.financialCategoryId}
                    onChange={(value) => updateField("financialCategoryId", value)}
                    options={categoryOptions}
                    placeholder="Selecionar categoria"
                    disabled={isLoadingOptions}
                    inputName="saleCategorySearch"
                  />
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

              <div className="admin-summary-list">
                <div className="admin-summary-row">
                  <span style={{ color: "var(--muted)" }}>Cliente</span>
                  <strong>{selectedCustomerName ?? "Consumidor nao identificado"}</strong>
                </div>
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
                  <span style={{ color: "var(--muted)" }}>Condicao</span>
                  <StatusBadge
                    status={form.paymentStatus === "PAID" ? "Recebida" : "A receber"}
                    tone={form.paymentStatus === "PAID" ? "success" : "warning"}
                  />
                </div>
              </div>

              {totals.stockAlerts || totals.marginAlerts ? (
                <div className="admin-page-stack">
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
              ) : form.paymentStatus === "PAID" ? (
                <Alert variant="success" title="Pronto para receber no ato">
                  Ao concluir, a venda sera registrada como recebida e nao ficara pendente no contas a receber.
                </Alert>
              ) : (
                <Alert variant="info" title="Pronto para concluir">
                  Ao concluir, a venda gerara uma conta a receber pendente para acompanhamento no financeiro.
                </Alert>
              )}
            </div>
          </SectionCard>

          <FormSection
            title="Detalhes adicionais"
            description="Use apenas quando esta venda nascer de um pedido, orcamento ou precisar de uma observacao operacional."
            defaultOpen={mode === "edit"}
          >
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
                    inputName="saleOrderSearch"
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
                    inputName="saleQuoteSearch"
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
