"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import { MoneyInput, PercentageInput, QuantityInput } from "@/components/forms/number-inputs";
import {
  Alert,
  Field,
  FormSection,
  LoadingButton,
  MetricCard,
  SectionCard,
  StatusBadge,
  StickyActionBar,
} from "@/components/admin/ui";
import {
  formatCurrencyValue,
  normalizeGtinInput,
  normalizeDecimalInput,
  formatCpfCnpj,
  normalizeReferenceInput,
  normalizeSkuInput,
  normalizeUnitInput,
  parseCurrencyInput,
  parseDecimalInput,
  parsePercentageInput,
} from "@/lib/forms/br-utils";
import {
  useSupplierLookup,
  type SupplierLookupOption,
} from "@/lib/forms/use-supplier-lookup";

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

type SupplierOption = SupplierLookupOption;

type EntryItemState = {
  id: string;
  productId: string;
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
  priceDecision: "KEEP_CURRENT" | "APPLY_SUGGESTED" | "CUSTOM_PRICE";
  decisionJustification: string;
  customSalePrice: string;
  supplierItemMappingId: string | null;
  lineNumber: number | null;
  supplierProductCode: string;
  supplierProductName: string;
  supplierEan: string;
  ncm: string;
  cfop: string;
  purchaseUnit: string;
  conversionFactor: string;
  matchStatus: string | null;
  matchConfidence: number | null;
};

type EntryFormState = {
  entryType:
    | "PURCHASE_INVOICE"
    | "PURCHASE_WITHOUT_INVOICE"
    | "INITIAL_BALANCE"
    | "RETURN"
    | "BONUS"
    | "OTHER";
  supplierId: string;
  supplierName: string;
  documentNumber: string;
  entryDate: string;
  notes: string;
  financialCondition: "NONE" | "CASH" | "TERM";
  financialAccountId: string;
  installmentCount: string;
  firstDueDate: string;
  items: EntryItemState[];
};

type ImportedProductDraft = {
  name: string;
  sku: string;
  barcode: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  unit: string;
  purchaseUnit: string;
  conversionFactor: string;
  controlsStock: boolean;
  desiredMargin: string;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
  saveSupplierMapping: boolean;
};

export type EntryDetail = {
  id: string;
  companyId: string;
  entryType: EntryFormState["entryType"];
  source?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierDocument?: string | null;
  documentNumber: string;
  documentSeries?: string | null;
  accessKey?: string | null;
  issuedAt?: string | null;
  protocol?: string | null;
  entryDate: string;
  notes?: string | null;
  financialCondition: EntryFormState["financialCondition"];
  financialAccountId?: string | null;
  installmentCount: number;
  firstDueDate?: string | null;
  status: "DRAFT" | "CONFIRMED" | "CANCELED";
  subtotal: number;
  totalAmount: number;
  confirmedAt?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    documentType?: string | null;
    source?: string | null;
    createdAt: string;
  }>;
  financialEntries?: Array<{
    id: string;
    entryType: "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "TRANSFER";
    status: string;
    amount: number;
    dueDate: string;
    paidAt?: string | null;
    installmentNumber?: number | null;
    installmentCount?: number | null;
  }>;
  items: Array<{
    id: string;
    productId?: string | null;
    productName: string;
    supplierItemMappingId?: string | null;
    lineNumber?: number | null;
    supplierProductCode?: string | null;
    supplierProductName?: string | null;
    supplierEan?: string | null;
    ncm?: string | null;
    cfop?: string | null;
    purchaseUnit?: string | null;
    conversionFactor?: number | null;
    matchStatus?: string | null;
    matchConfidence?: number | null;
    description: string;
    unit: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
    previousCostPrice?: number | null;
    previousSalePrice?: number | null;
    suggestedSalePrice?: number | null;
    estimatedMarginPercent?: number | null;
    priceDecision?: string | null;
    decisionJustification?: string | null;
    customSalePrice?: number | null;
  }>;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type CreateImportedProductResult = {
  entry: EntryDetail;
  product: ProductOption;
};

type EntryFormProps = {
  mode: "create" | "edit";
  entryId?: string;
  initialData?: EntryDetail;
};

const defaultState: EntryFormState = {
  entryType: "PURCHASE_INVOICE",
  supplierId: "",
  supplierName: "",
  documentNumber: "",
  entryDate: new Date().toISOString().slice(0, 10),
  notes: "",
  financialCondition: "NONE",
  financialAccountId: "",
  installmentCount: "1",
  firstDueDate: new Date().toISOString().slice(0, 10),
  items: [createEmptyItem()],
};

function createEmptyItem(): EntryItemState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: "",
    description: "",
    unit: "",
    quantity: "1",
    unitCost: "0,00",
    priceDecision: "KEEP_CURRENT",
    decisionJustification: "",
    customSalePrice: "0,00",
    supplierItemMappingId: null,
    lineNumber: null,
    supplierProductCode: "",
    supplierProductName: "",
    supplierEan: "",
    ncm: "",
    cfop: "",
    purchaseUnit: "",
    conversionFactor: "",
    matchStatus: null,
    matchConfidence: null,
  };
}

function mapInitialDataToState(entry: EntryDetail): EntryFormState {
  return {
    entryType: entry.entryType,
    supplierId: entry.supplierId ?? "",
    supplierName: entry.supplierName ?? "",
    documentNumber: entry.documentNumber,
    entryDate: entry.entryDate.slice(0, 10),
    notes: entry.notes ?? "",
    financialCondition: entry.financialCondition,
    financialAccountId: entry.financialAccountId ?? "",
    installmentCount: String(entry.installmentCount || 1),
    firstDueDate: entry.firstDueDate ? entry.firstDueDate.slice(0, 10) : "",
    items:
      entry.items.length > 0
        ? entry.items.map((item) => ({
            id: item.id,
            productId: item.productId ?? "",
            description: item.description,
            unit: item.unit,
            quantity: normalizeDecimalInput(String(item.quantity)),
            unitCost: formatCurrencyValue(item.unitCost),
            priceDecision: normalizePriceDecision(item.priceDecision),
            decisionJustification: item.decisionJustification ?? "",
            customSalePrice: formatCurrencyValue(item.customSalePrice ?? 0),
            supplierItemMappingId: item.supplierItemMappingId ?? null,
            lineNumber: item.lineNumber ?? null,
            supplierProductCode: item.supplierProductCode ?? "",
            supplierProductName: item.supplierProductName ?? "",
            supplierEan: item.supplierEan ?? "",
            ncm: item.ncm ?? "",
            cfop: item.cfop ?? "",
            purchaseUnit: item.purchaseUnit ?? "",
            conversionFactor:
              item.conversionFactor === null || item.conversionFactor === undefined
                ? ""
                : normalizeDecimalInput(String(item.conversionFactor)),
            matchStatus: item.matchStatus ?? null,
            matchConfidence: item.matchConfidence ?? null,
          }))
        : [createEmptyItem()],
  };
}

function createImportedProductDraft(item: EntryItemState): ImportedProductDraft {
  return {
    name: item.supplierProductName || item.description || "",
    sku: normalizeSkuInput(item.supplierProductCode || ""),
    barcode: normalizeGtinInput(item.supplierEan || ""),
    type: "RAW_MATERIAL",
    unit: normalizeUnitInput(item.unit || "un") || "un",
    purchaseUnit: normalizeUnitInput(item.purchaseUnit || item.unit || "un") || "un",
    conversionFactor: item.conversionFactor || "1",
    controlsStock: true,
    desiredMargin: "",
    costPrice: item.unitCost || "0,00",
    salePrice: item.unitCost || "0,00",
    minimumStock: "0",
    saveSupplierMapping: true,
  };
}

function normalizePriceDecision(
  value?: string | null,
): EntryItemState["priceDecision"] {
  if (value === "APPLY_SUGGESTED" || value === "CUSTOM_PRICE") {
    return value;
  }

  return "KEEP_CURRENT";
}

export function EntryForm({ mode, entryId, initialData }: Readonly<EntryFormProps>) {
  const router = useRouter();
  const [form, setForm] = useState<EntryFormState>(initialData ? mapInitialDataToState(initialData) : defaultState);
  const [entrySnapshot, setEntrySnapshot] = useState<EntryDetail | null>(initialData ?? null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [matchingItemId, setMatchingItemId] = useState<string | null>(null);
  const [isApplyingSuggestedMatches, setIsApplyingSuggestedMatches] = useState(false);
  const [creatingProductItemId, setCreatingProductItemId] = useState<string | null>(null);
  const [openProductDraftItemId, setOpenProductDraftItemId] = useState<string | null>(null);
  const [productDrafts, setProductDrafts] = useState<Record<string, ImportedProductDraft>>({});
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);
  const [selectedAttachmentType, setSelectedAttachmentType] = useState("OTHER");
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isImportedDraft = entrySnapshot?.source === "XML";
  const initialSupplierOptions = useMemo<SupplierOption[]>(
    () =>
      entrySnapshot?.supplierId
        ? [
            {
              id: entrySnapshot.supplierId,
              legalName: entrySnapshot.supplierName ?? "Fornecedor",
              displayName: entrySnapshot.supplierName ?? "Fornecedor",
              document: entrySnapshot.supplierDocument ?? null,
              isActive: true,
            },
          ]
        : [],
    [entrySnapshot?.supplierDocument, entrySnapshot?.supplierId, entrySnapshot?.supplierName],
  );
  const {
    suppliers,
    supplierLookupOptions,
    isSearching: isSearchingSuppliers,
    searchError: supplierSearchError,
    setQuery: setSupplierSearchQuery,
  } = useSupplierLookup({
    initialSuppliers: initialSupplierOptions,
    includeInactive: mode === "edit",
  });
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === form.supplierId) ?? null,
    [form.supplierId, suppliers],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const [productsResponse, accountsResponse] = await Promise.all([
          fetch("/api/inventory/products", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/financial/accounts", { signal: controller.signal, cache: "no-store" }),
        ]);

        const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;
        const accountsResult = (await accountsResponse.json()) as ApiResult<AccountOption[]>;

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens.");
          return;
        }

        if (!accountsResponse.ok || !accountsResult.success || !accountsResult.data) {
          setErrorMessage(accountsResult.message ?? "Nao foi possivel carregar as contas.");
          return;
        }

        setProducts(productsResult.data);
        setAccounts(accountsResult.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar os dados auxiliares da entrada.");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();

    return () => controller.abort();
  }, []);

  const productOptions = useMemo<SearchableSelectOption[]>(
    () =>
      products.map((product) => ({
        value: product.id,
        label: product.name,
        description: [
          product.sku ? `SKU ${product.sku}` : "Sem SKU",
          product.barcode ? `EAN ${product.barcode}` : "Sem EAN",
          `${product.unit} | custo atual ${formatCurrency(product.costPrice)}`,
        ].join(" | "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit],
      })),
    [products],
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

  const computedItems = useMemo(
    () =>
      form.items.map((item) => {
        const parsedQuantity = parseDecimalInput(item.quantity);
        const parsedUnitCost = parseCurrencyInput(item.unitCost);
        return {
          ...item,
          parsedQuantity,
          parsedUnitCost,
          subtotal: roundCurrency(parsedQuantity * parsedUnitCost),
        };
      }),
    [form.items],
  );

  const subtotal = useMemo(
    () => roundCurrency(computedItems.reduce((sum, item) => sum + item.subtotal, 0)),
    [computedItems],
  );

  const suggestedImportedItems = useMemo(
    () => computedItems.filter((item) => item.matchStatus === "SUGGESTED" && item.productId),
    [computedItems],
  );

  function updateField<K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSupplierSelectionChange(supplierId: string) {
    if (!supplierId) {
      updateField("supplierId", "");
      return;
    }

    const supplier = suppliers.find((item) => item.id === supplierId);
    updateField("supplierId", supplierId);

    if (supplier) {
      updateField("supplierName", supplier.displayName);
    }
  }

  function updateItem(itemId: string, field: keyof EntryItemState, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  }

  function ensureImportedProductDraft(item: EntryItemState) {
    setProductDrafts((current) => {
      if (current[item.id]) {
        return current;
      }

      return {
        ...current,
        [item.id]: createImportedProductDraft(item),
      };
    });
  }

  function openImportedProductDraft(item: EntryItemState) {
    ensureImportedProductDraft(item);
    setOpenProductDraftItemId(item.id);
  }

  function updateProductDraft(
    itemId: string,
    field: keyof ImportedProductDraft,
    value: string | boolean,
  ) {
    setProductDrafts((current) => {
      const baseItem = form.items.find((item) => item.id === itemId) ?? createEmptyItem();
      const baseDraft = current[itemId] ?? createImportedProductDraft(baseItem);
      const nextDraft = {
        ...baseDraft,
        [field]: value,
      } as ImportedProductDraft;

      if (field === "type") {
        if (value === "SERVICE") {
          nextDraft.controlsStock = false;
        } else if (baseDraft.type === "SERVICE") {
          nextDraft.controlsStock = true;
        }
      }

      return {
        ...current,
        [itemId]: nextDraft,
      };
    });
  }

  function addItem() {
    if (isImportedDraft) {
      return;
    }

    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()],
    }));
  }

  function removeItem(itemId: string) {
    if (isImportedDraft) {
      return;
    }

    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== itemId),
      }));
  }

  async function requestImportedItemMatch(item: EntryItemState) {
    if (!entryId || !isImportedDraft || !item.productId) {
      throw new Error("Selecione o item interno antes de conciliar a linha importada.");
    }

    const response = await fetch(`/api/inventory/entries/${entryId}/items/${item.id}/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        internalItemId: item.productId,
        saveSupplierMapping: true,
        purchaseUnit: item.purchaseUnit || item.unit,
        stockUnit: item.unit,
        conversionFactor: item.conversionFactor
          ? parseDecimalInput(item.conversionFactor)
          : 1,
        confidence: item.matchConfidence ?? 100,
      }),
    });

    const result = (await response.json()) as ApiResult<EntryDetail>;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message ?? "Nao foi possivel conciliar este item importado.");
    }

    setEntrySnapshot(result.data);
    setForm(mapInitialDataToState(result.data));

    return result.data;
  }

  async function handleMatchImportedItem(itemId: string) {
    if (!entryId || !isImportedDraft) {
      return;
    }

    const item = form.items.find((entryItem) => entryItem.id === itemId);
    if (!item?.productId) {
      setErrorMessage("Selecione o item interno antes de conciliar a linha importada.");
      setSuccessMessage(null);
      return;
    }

    setMatchingItemId(itemId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await requestImportedItemMatch(item);
      setSuccessMessage("Item conciliado com sucesso. Voce ja pode confirmar a entrada quando terminar a revisao.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao conciliar o item importado.",
      );
    } finally {
      setMatchingItemId(null);
    }
  }

  async function handleApplySuggestedMatches() {
    if (!entryId || !isImportedDraft) {
      return;
    }

    const itemsToApply = form.items.filter(
      (item) => item.matchStatus === "SUGGESTED" && item.productId,
    );

    if (!itemsToApply.length) {
      setSuccessMessage("Nao ha sugestoes pendentes para confirmar nesta entrada.");
      setErrorMessage(null);
      return;
    }

    setIsApplyingSuggestedMatches(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      for (const suggestedItem of itemsToApply) {
        const latestItem =
          form.items.find((item) => item.id === suggestedItem.id) ?? suggestedItem;
        await requestImportedItemMatch(latestItem);
      }

      setSuccessMessage(
        `${itemsToApply.length} sugest${itemsToApply.length > 1 ? "oes foram confirmadas" : "ao foi confirmada"} com sucesso.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao confirmar as sugestoes de conciliacao em lote.",
      );
    } finally {
      setIsApplyingSuggestedMatches(false);
    }
  }

  async function handleCreateProductFromImportedItem(itemId: string) {
    if (!entryId || !isImportedDraft) {
      return;
    }

    const item = form.items.find((entryItem) => entryItem.id === itemId);
    const draft = productDrafts[itemId] ?? (item ? createImportedProductDraft(item) : null);

    if (!item || !draft) {
      setErrorMessage("Nao foi possivel localizar a linha importada para criar o item.");
      setSuccessMessage(null);
      return;
    }

    if (draft.name.trim().length < 2) {
      setErrorMessage("Informe o nome do item interno antes de cadastrar.");
      setSuccessMessage(null);
      return;
    }

    if (!draft.unit.trim()) {
      setErrorMessage("Informe a unidade interna do item antes de cadastrar.");
      setSuccessMessage(null);
      return;
    }

    if (parseCurrencyInput(draft.costPrice) < 0 || parseCurrencyInput(draft.salePrice) < 0) {
      setErrorMessage("Os valores do item interno nao podem ser negativos.");
      setSuccessMessage(null);
      return;
    }

    if (parseDecimalInput(draft.minimumStock) < 0) {
      setErrorMessage("O estoque minimo do item interno nao pode ser negativo.");
      setSuccessMessage(null);
      return;
    }

    if (draft.desiredMargin && (parsePercentageInput(draft.desiredMargin) < 0 || parsePercentageInput(draft.desiredMargin) >= 100)) {
      setErrorMessage("A margem desejada deve ficar entre 0 e 99,99%.");
      setSuccessMessage(null);
      return;
    }

    setCreatingProductItemId(itemId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/inventory/entries/${entryId}/items/${itemId}/create-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: draft.name.trim(),
          sku: draft.sku || undefined,
          barcode: draft.barcode || undefined,
          type: draft.type,
          unit: draft.unit,
          purchaseUnit: draft.purchaseUnit || undefined,
          stockUnit: draft.unit,
          conversionFactor: parseDecimalInput(draft.conversionFactor) > 0 ? parseDecimalInput(draft.conversionFactor) : undefined,
          controlsStock: draft.type === "SERVICE" ? false : draft.controlsStock,
          desiredMargin: draft.desiredMargin ? parsePercentageInput(draft.desiredMargin) : undefined,
          costPrice: parseCurrencyInput(draft.costPrice),
          salePrice: parseCurrencyInput(draft.salePrice),
          minimumStock: parseDecimalInput(draft.minimumStock),
          saveSupplierMapping: draft.saveSupplierMapping,
        }),
      });

      const result = (await response.json()) as ApiResult<CreateImportedProductResult>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel cadastrar o item a partir da linha importada.");
        return;
      }

      setProducts((current) => {
        const next = current.filter((product) => product.id !== result.data!.product.id);
        return [...next, result.data!.product].sort((left, right) => left.name.localeCompare(right.name));
      });
      setEntrySnapshot(result.data.entry);
      setForm(mapInitialDataToState(result.data.entry));
      setOpenProductDraftItemId(null);
      setProductDrafts((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setSuccessMessage(`Item interno ${result.data.product.name} criado e vinculado com sucesso.`);
    } catch {
      setErrorMessage("Falha ao cadastrar o item a partir da linha importada.");
    } finally {
      setCreatingProductItemId(null);
    }
  }

  async function handleUploadAttachment() {
    if (!entryId || !entrySnapshot) {
      return;
    }

    if (!selectedAttachmentFile) {
      setErrorMessage("Selecione um arquivo antes de anexar a entrada.");
      setSuccessMessage(null);
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", selectedAttachmentFile);
      formData.set("documentType", selectedAttachmentType);

      const response = await fetch(`/api/inventory/entries/${entryId}/attachments`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ApiResult<EntryDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel anexar o arquivo a esta entrada.");
        return;
      }

      setEntrySnapshot(result.data);
      setForm(mapInitialDataToState(result.data));
      setSelectedAttachmentFile(null);
      setSelectedAttachmentType("OTHER");
      setAttachmentInputKey((current) => current + 1);
      setSuccessMessage("Anexo enviado com sucesso para a entrada.");
    } catch {
      setErrorMessage("Falha ao anexar o arquivo operacional.");
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!entryId || !entrySnapshot) {
      return;
    }

    const confirmed = window.confirm(
      "Deseja remover este anexo manual da entrada? O XML original importado nao pode ser excluido.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/inventory/entries/${entryId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as ApiResult<EntryDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel remover o anexo da entrada.");
        return;
      }

      setEntrySnapshot(result.data);
      setForm(mapInitialDataToState(result.data));
      setSuccessMessage("Anexo removido com sucesso.");
    } catch {
      setErrorMessage("Falha ao remover o anexo operacional.");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  function handleProductSelection(itemId: string, productId: string) {
    const product = products.find((item) => item.id === productId);

    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId,
              description:
                isImportedDraft || !product ? item.description : product.name,
              unit:
                isImportedDraft
                  ? item.unit || product?.unit || item.unit
                  : product?.unit || item.unit,
              unitCost:
                isImportedDraft || !product
                  ? item.unitCost
                  : formatCurrencyValue(product.costPrice),
            }
          : item,
      ),
    }));
  }

  function validateForm() {
    if (!form.documentNumber.trim()) {
      return "Informe o numero do documento.";
    }

    if (!form.entryDate) {
      return "Informe a data da entrada.";
    }

    if (form.financialCondition !== "NONE" && !form.financialAccountId) {
      return "Selecione a conta financeira para entradas com efeito financeiro.";
    }

    if (form.financialCondition === "TERM" && Number(form.installmentCount) < 1) {
      return "Informe a quantidade de parcelas.";
    }

    if (form.financialCondition !== "NONE" && !form.firstDueDate) {
      return "Informe o primeiro vencimento.";
    }

    for (const [index, item] of form.items.entries()) {
      if (!item.productId) {
        return `Selecione o item ${index + 1}.`;
      }

      if (item.description.trim().length < 2) {
        return `Informe a descricao do item ${index + 1}.`;
      }

      if (!item.unit.trim()) {
        return `Informe a unidade do item ${index + 1}.`;
      }

      if (parseDecimalInput(item.quantity) <= 0) {
        return `Informe uma quantidade valida para o item ${index + 1}.`;
      }

      const unitCost = parseCurrencyInput(item.unitCost);
      if (unitCost < 0) {
        return `Informe um custo unitario valido para o item ${index + 1}.`;
      }

      if (!entryTypeAllowsZeroCost(form.entryType) && unitCost <= 0) {
        return `Informe um custo maior que zero para o item ${index + 1}.`;
      }

      if (item.priceDecision === "CUSTOM_PRICE" && parseCurrencyInput(item.customSalePrice) <= 0) {
        return `Informe o novo preco de venda do item ${index + 1}.`;
      }
    }

    if (!entryTypeAllowsZeroCost(form.entryType) && subtotal <= 0) {
      return "A entrada precisa ter valor total maior que zero.";
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
        entryType: form.entryType,
        supplierId: form.supplierId || undefined,
        supplierDocument: selectedSupplier?.document ?? entrySnapshot?.supplierDocument ?? undefined,
        supplierName: form.supplierName.trim() || undefined,
        documentNumber: normalizeReferenceInput(form.documentNumber),
        entryDate: form.entryDate,
        notes: form.notes.trim() || undefined,
        financialCondition: form.financialCondition,
        financialAccountId: form.financialAccountId || undefined,
        installmentCount: form.financialCondition === "TERM" ? Number(form.installmentCount) : 1,
        firstDueDate: form.financialCondition !== "NONE" ? form.firstDueDate : undefined,
        items: form.items.map((item) => ({
          id: mode === "edit" ? item.id : undefined,
          productId: item.productId,
          description: item.description.trim(),
          unit: normalizeUnitInput(item.unit),
          quantity: parseDecimalInput(item.quantity),
          unitCost: parseCurrencyInput(item.unitCost),
          priceDecision: item.priceDecision,
          decisionJustification: item.decisionJustification.trim() || undefined,
          customSalePrice:
            item.priceDecision === "CUSTOM_PRICE"
              ? parseCurrencyInput(item.customSalePrice)
              : undefined,
        })),
      };

      const endpoint = mode === "create" ? "/api/inventory/entries" : `/api/inventory/entries/${entryId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResult<EntryDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar a entrada.");
        return;
      }

      if (mode === "create") {
        setSuccessMessage("Entrada criada com sucesso.");

        window.setTimeout(() => {
          router.push("/admin/estoque/entradas?feedback=entry-created");
          router.refresh();
        }, 700);

        return;
      }

      setEntrySnapshot(result.data);
      setForm(mapInitialDataToState(result.data));
      setSuccessMessage("Entrada atualizada com sucesso.");
      router.refresh();
    } catch {
      setErrorMessage("Falha ao salvar a entrada.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (mode !== "edit" || !entryId || entrySnapshot?.status !== "DRAFT") {
      return;
    }

    if (suggestedImportedItems.length > 0) {
      setErrorMessage(
        "Ainda existem sugestoes de conciliacao aguardando confirmacao. Revise essas linhas ou use a confirmacao em lote antes de concluir a entrada.",
      );
      setSuccessMessage(null);
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/inventory/entries/${entryId}/confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = (await response.json()) as ApiResult<EntryDetail>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel confirmar a entrada.");
        return;
      }

      if (!result.data) {
        setErrorMessage("A entrada foi confirmada, mas nao foi possivel atualizar a tela.");
        return;
      }

      setEntrySnapshot(result.data);
      setForm(mapInitialDataToState(result.data));
      setSuccessMessage(
        result.data.financialEntries?.length
          ? "Entrada confirmada com sucesso. O estoque foi atualizado e a conta a pagar ja foi gerada."
          : "Entrada confirmada com sucesso. O estoque foi atualizado.",
      );
      router.refresh();
    } catch {
      setErrorMessage("Falha ao confirmar a entrada.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleCancelConfirmedEntry() {
    if (mode !== "edit" || !entryId || entrySnapshot?.status !== "CONFIRMED") {
      return;
    }

    const justification = window.prompt(
      "Informe a justificativa do cancelamento desta entrada confirmada:",
      "",
    );

    if (!justification) {
      return;
    }

    setIsCanceling(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/inventory/entries/${entryId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ justification }),
      });

      const result = (await response.json()) as ApiResult<EntryDetail>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel cancelar a entrada.");
        return;
      }

      if (!result.data) {
        setErrorMessage("A entrada foi cancelada, mas nao foi possivel atualizar a tela.");
        return;
      }

      setEntrySnapshot(result.data);
      setForm(mapInitialDataToState(result.data));
      setSuccessMessage("Entrada cancelada com sucesso.");
      router.refresh();
    } catch {
      setErrorMessage("Falha ao cancelar a entrada.");
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <div className="admin-page-stack">
      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel salvar a entrada">
          {errorMessage}
        </Alert>
      ) : null}

      {entrySnapshot?.attachments?.length ? (
        <SectionCard
          title="Anexos do documento"
          description="O XML original e os demais arquivos operacionais ficam vinculados a esta entrada para consulta futura."
        >
          {entrySnapshot.status !== "CANCELED" ? (
            <div className="admin-page-stack" style={{ marginBottom: 16 }}>
              <div className="admin-form-grid admin-form-grid--3">
                <Field label="Tipo do anexo">
                  <select
                    className="admin-select"
                    value={selectedAttachmentType}
                    onChange={(event) => setSelectedAttachmentType(event.target.value)}
                  >
                    <option value="DANFE_PDF">DANFE PDF</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="PAYMENT_RECEIPT">Comprovante de pagamento</option>
                    <option value="RECEIPT">Recibo</option>
                    <option value="SUPPLIER_QUOTE">Orcamento do fornecedor</option>
                    <option value="MERCHANDISE_PHOTO">Foto da mercadoria</option>
                    <option value="OTHER">Outro documento</option>
                  </select>
                </Field>

                <Field label="Arquivo" helpText="PDF, imagem ou documento operacional complementar.">
                  <input
                    key={attachmentInputKey}
                    className="admin-input"
                    type="file"
                    onChange={(event) =>
                      setSelectedAttachmentFile(event.target.files?.[0] ?? null)
                    }
                  />
                </Field>

                <Field label="Acao">
                  <div className="admin-row" style={{ minHeight: 44, alignItems: "center" }}>
                    <LoadingButton
                      type="button"
                      className="admin-button admin-button--secondary"
                      isLoading={isUploadingAttachment}
                      loadingLabel="Enviando..."
                      onClick={handleUploadAttachment}
                      disabled={!selectedAttachmentFile}
                    >
                      Anexar arquivo
                    </LoadingButton>
                  </div>
                </Field>
              </div>
            </div>
          ) : null}

          <div className="admin-list-stack">
            {entrySnapshot.attachments.map((attachment) => (
              <article key={attachment.id} className="admin-list-card">
                <div className="admin-row admin-row--between" style={{ gap: 12, alignItems: "center" }}>
                  <div className="admin-inline-stack">
                    <strong>{attachment.fileName}</strong>
                    <span className="admin-list-card__subtitle">
                      {formatAttachmentDocumentType(attachment.documentType)} | {formatFileSize(attachment.fileSize)} | {formatDate(attachment.createdAt)}
                    </span>
                  </div>
                  <div className="admin-row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <Link
                      href={`/api/inventory/entries/${entrySnapshot.id}/attachments/${attachment.id}`}
                      className="admin-link-button"
                      target="_blank"
                    >
                      Abrir arquivo
                    </Link>
                    {canDeleteAttachment(entrySnapshot.status, attachment) ? (
                      <LoadingButton
                        type="button"
                        className="admin-button admin-button--danger"
                        isLoading={deletingAttachmentId === attachment.id}
                        loadingLabel="Removendo..."
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        Remover
                      </LoadingButton>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : entrySnapshot && entrySnapshot.status !== "CANCELED" ? (
        <SectionCard
          title="Anexos do documento"
          description="Anexe DANFE, boleto, comprovante, fotos ou outros arquivos operacionais desta entrada."
        >
          <div className="admin-form-grid admin-form-grid--3">
            <Field label="Tipo do anexo">
              <select
                className="admin-select"
                value={selectedAttachmentType}
                onChange={(event) => setSelectedAttachmentType(event.target.value)}
              >
                <option value="DANFE_PDF">DANFE PDF</option>
                <option value="BOLETO">Boleto</option>
                <option value="PAYMENT_RECEIPT">Comprovante de pagamento</option>
                <option value="RECEIPT">Recibo</option>
                <option value="SUPPLIER_QUOTE">Orcamento do fornecedor</option>
                <option value="MERCHANDISE_PHOTO">Foto da mercadoria</option>
                <option value="OTHER">Outro documento</option>
              </select>
            </Field>

            <Field label="Arquivo" helpText="PDF, imagem ou documento operacional complementar.">
              <input
                key={attachmentInputKey}
                className="admin-input"
                type="file"
                onChange={(event) =>
                  setSelectedAttachmentFile(event.target.files?.[0] ?? null)
                }
              />
            </Field>

            <Field label="Acao">
              <div className="admin-row" style={{ minHeight: 44, alignItems: "center" }}>
                <LoadingButton
                  type="button"
                  className="admin-button admin-button--secondary"
                  isLoading={isUploadingAttachment}
                  loadingLabel="Enviando..."
                  onClick={handleUploadAttachment}
                  disabled={!selectedAttachmentFile}
                >
                  Anexar arquivo
                </LoadingButton>
              </div>
            </Field>
          </div>
        </SectionCard>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {entrySnapshot ? (
        <div className="admin-card-grid">
          <MetricCard label="Status" value={formatEntryStatus(entrySnapshot.status)} />
          <MetricCard label="Criado em" value={formatDate(entrySnapshot.createdAt)} />
          <MetricCard label="Ultima atualizacao" value={formatDate(entrySnapshot.updatedAt)} />
          {entrySnapshot.source === "XML" ? (
            <MetricCard label="Origem" value="XML NF-e" description={entrySnapshot.documentSeries ? `Serie ${entrySnapshot.documentSeries}` : "Pre-entrada importada"} />
          ) : null}
        </div>
      ) : null}

      {entrySnapshot?.source === "XML" ? (
        <Alert variant="info" title="Rascunho criado a partir de XML">
          Revise a conciliacao dos itens, confirme os dados do documento e so depois conclua a entrada. O estoque ainda nao foi alterado.
        </Alert>
      ) : null}

      {entrySnapshot?.source === "XML" && suggestedImportedItems.length > 0 ? (
        <Alert variant="warning" title="Sugestoes aguardando confirmacao">
          <div className="admin-page-stack">
            <span>
              Esta entrada possui {suggestedImportedItems.length} sugest
              {suggestedImportedItems.length > 1 ? "oes" : "ao"} de conciliacao de baixa
              confianca. Confirme manualmente as linhas ou aplique a confirmacao em lote antes de concluir a entrada.
            </span>
            <div className="admin-row" style={{ gap: 12, flexWrap: "wrap" }}>
              <LoadingButton
                type="button"
                className="admin-button admin-button--secondary"
                isLoading={isApplyingSuggestedMatches}
                loadingLabel="Confirmando sugestoes..."
                onClick={handleApplySuggestedMatches}
              >
                Confirmar sugestoes em lote
              </LoadingButton>
            </div>
          </div>
        </Alert>
      ) : null}

      {entrySnapshot?.status === "CONFIRMED" ? (
        <Alert variant="success" title="Entrada confirmada">
          O estoque ja foi atualizado. Para desfazer esta operacao, use o cancelamento com justificativa.
        </Alert>
      ) : null}

      {entrySnapshot?.status === "CANCELED" ? (
        <Alert variant="warning" title="Entrada cancelada">
          {entrySnapshot.cancelReason
            ? `Motivo registrado: ${entrySnapshot.cancelReason}`
            : "Esta entrada foi cancelada e nao pode mais ser alterada diretamente."}
        </Alert>
      ) : null}

      <form className="admin-page-stack" onSubmit={handleSubmit}>
        <SectionCard
          title="Etapa 1 - Documento"
          description="Registre o tipo de entrada, o documento e as observacoes principais antes de revisar os itens."
        >
          <div className="admin-form-grid admin-form-grid--3">
            <Field label="Tipo da entrada" required>
              <select
                className="admin-select"
                value={form.entryType}
                onChange={(event) =>
                  updateField("entryType", event.target.value as EntryFormState["entryType"])
                }
              >
                <option value="PURCHASE_INVOICE">Nota fiscal de compra</option>
                <option value="PURCHASE_WITHOUT_INVOICE">Compra sem nota</option>
                <option value="INITIAL_BALANCE">Saldo inicial</option>
                <option value="RETURN">Devolucao</option>
                <option value="BONUS">Bonificacao</option>
                <option value="OTHER">Outra entrada</option>
              </select>
            </Field>

            <Field
              label="Fornecedor cadastrado"
              optional
              helpText={
                supplierSearchError
                  ? supplierSearchError
                  : "Use o cadastro quando o fornecedor ja existir. O nome do documento continua editavel logo abaixo."
              }
            >
              <div className="admin-page-stack" style={{ gap: 10 }}>
                <SearchableSelect
                  value={form.supplierId}
                  onChange={handleSupplierSelectionChange}
                  onQueryChange={setSupplierSearchQuery}
                  options={supplierLookupOptions}
                  placeholder="Pesquisar por nome, documento ou contato"
                  disabled={isLoadingOptions}
                  emptyMessage="Nenhum fornecedor encontrado."
                  isLoading={isSearchingSuppliers}
                  loadingMessage="Pesquisando fornecedores..."
                  clearable
                  inputName="inventoryEntrySupplierSearch"
                  ariaLabel="Pesquisar fornecedor"
                />
                <div className="admin-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Link href="/admin/fornecedores/novo" className="admin-link-button">
                    Cadastrar fornecedor
                  </Link>
                  {selectedSupplier?.document ? (
                    <span className="admin-list-card__subtitle">
                      Documento: {formatCpfCnpj(selectedSupplier.document)}
                    </span>
                  ) : null}
                </div>
              </div>
            </Field>

            <Field
              label="Nome do fornecedor no documento"
              optional
              helpText="Esse nome e salvo no historico da entrada, mesmo quando houver cadastro vinculado."
            >
              <input
                className="admin-input"
                value={form.supplierName}
                onChange={(event) => updateField("supplierName", event.target.value)}
                placeholder="Nome que veio na nota, orcamento ou comprovante"
              />
            </Field>

            <Field label="Numero do documento" required>
              <input
                className="admin-input"
                value={form.documentNumber}
                onChange={(event) =>
                  updateField("documentNumber", normalizeReferenceInput(event.target.value))
                }
                placeholder="NF12345"
              />
            </Field>

            <Field label="Data da entrada" required>
              <input
                className="admin-input"
                type="date"
                value={form.entryDate}
                onChange={(event) => updateField("entryDate", event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Observacoes"
            optional
            helpText="Use este campo para complementar conferencia, frete, numero auxiliar ou detalhes operacionais."
          >
            <textarea
              className="admin-textarea"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Observacoes operacionais, numero auxiliar, conferente, frete, avarias..."
            />
          </Field>
        </SectionCard>

        <SectionCard
          title="Etapa 2 - Itens"
          description="Cada item confirmado gera movimento de entrada e cria camada FIFO para o consumo futuro."
          actions={
            !isImportedDraft ? (
              <button type="button" className="admin-button admin-button--secondary" onClick={addItem}>
                Adicionar item
              </button>
            ) : null
          }
        >
          <div className="admin-list-stack">
            {computedItems.map((item, index) => (
              <article key={item.id} className="admin-list-card">
                <div className="admin-row admin-row--between">
                  <strong>Item {index + 1}</strong>
                  <StatusBadge status="Em montagem" tone="info" />
                </div>

                <div className="admin-form-grid admin-form-grid--2">
                  <Field label="Item cadastrado" required>
                    <SearchableSelect
                      value={item.productId}
                      onChange={(value) => handleProductSelection(item.id, value)}
                      options={productOptions}
                      placeholder="Pesquisar por nome, SKU ou EAN"
                      disabled={isLoadingOptions}
                      emptyMessage="Nenhum item encontrado."
                      inputName={`inventoryEntryItemSearch-${index + 1}`}
                      ariaLabel={`Pesquisar item de entrada ${index + 1}`}
                    />
                  </Field>

                  <Field label="Descricao" required>
                    <input
                      className="admin-input"
                      value={item.description}
                      onChange={(event) => updateItem(item.id, "description", event.target.value)}
                    />
                  </Field>
                </div>

                <div className="admin-form-grid admin-form-grid--4">
                  <Field label="Unidade" required>
                    <input
                      className="admin-input"
                      value={item.unit}
                      onChange={(event) =>
                        updateItem(item.id, "unit", normalizeUnitInput(event.target.value))
                      }
                    />
                  </Field>

                  <Field label="Quantidade" required>
                    <QuantityInput
                      className="admin-input"
                      value={item.quantity}
                      onChange={(value) => updateItem(item.id, "quantity", value)}
                    />
                  </Field>

                  <Field label="Custo unitario" required>
                    <MoneyInput
                      className="admin-input"
                      value={item.unitCost}
                      onChange={(value) => updateItem(item.id, "unitCost", value)}
                    />
                  </Field>

                  <Field label="Subtotal">
                    <div className="admin-readonly-box admin-readonly-box--emphasis">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </Field>
                </div>

                {isImportedDraft ? (
                  <div className="admin-surface-muted">
                    <div className="admin-row admin-row--between" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div className="admin-inline-stack">
                        <strong>Conciliacao do XML</strong>
                        <span className="admin-list-card__subtitle">
                          Linha {item.lineNumber ?? "-"} | codigo {item.supplierProductCode || "sem codigo"} | EAN {item.supplierEan || "sem GTIN"}
                        </span>
                      </div>
                      <div className="admin-row" style={{ gap: 10, flexWrap: "wrap" }}>
                        <StatusBadge
                          status={formatMatchStatus(item.matchStatus)}
                          tone={matchStatusTone(item.matchStatus)}
                        />
                        <LoadingButton
                          type="button"
                          className="admin-button admin-button--secondary"
                          isLoading={matchingItemId === item.id}
                          loadingLabel="Conciliando..."
                          onClick={() => handleMatchImportedItem(item.id)}
                          disabled={!item.productId}
                        >
                          {item.matchStatus === "MATCHED" ? "Atualizar conciliacao" : "Conciliar item"}
                        </LoadingButton>
                        {item.matchStatus !== "MATCHED" ? (
                          <button
                            type="button"
                            className="admin-button admin-button--ghost"
                            onClick={() => openImportedProductDraft(item)}
                          >
                            Cadastrar novo item
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="admin-list-card__meta" style={{ marginTop: 12 }}>
                      <SmallFact label="Descricao do fornecedor" value={item.supplierProductName || item.description} />
                      <SmallFact label="Unidade de compra" value={item.purchaseUnit || "-"} />
                      <SmallFact label="Fator de conversao" value={item.conversionFactor || "1"} />
                      <SmallFact label="Confianca" value={item.matchConfidence !== null ? `${item.matchConfidence}%` : "-"} />
                    </div>

                    <div className="admin-form-grid admin-form-grid--4" style={{ marginTop: 16 }}>
                      <Field
                        label="Unidade de compra"
                        optional
                        helpText="Usada para salvar o vinculo do fornecedor com a unidade que veio no XML."
                      >
                        <input
                          className="admin-input"
                          value={item.purchaseUnit}
                          onChange={(event) =>
                            updateItem(item.id, "purchaseUnit", normalizeUnitInput(event.target.value))
                          }
                          placeholder="cx, pct, resma..."
                        />
                      </Field>

                      <Field
                        label="Fator de conversao"
                        optional
                        helpText="Informe quantas unidades internas existem em cada unidade de compra, quando necessario."
                      >
                        <QuantityInput
                          className="admin-input"
                          value={item.conversionFactor}
                          onChange={(value) => updateItem(item.id, "conversionFactor", value)}
                        />
                      </Field>
                    </div>

                    {openProductDraftItemId === item.id ? (
                      <div className="admin-page-stack" style={{ marginTop: 16 }}>
                        <FormSection
                          title="Cadastro assistido do item interno"
                          description="Use os dados da linha importada para criar o item no cadastro e vincular automaticamente a esta entrada."
                          defaultOpen
                        >
                          <div className="admin-form-grid admin-form-grid--2">
                            <Field label="Nome do item interno" required>
                              <input
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).name}
                                onChange={(event) => updateProductDraft(item.id, "name", event.target.value)}
                              />
                            </Field>

                            <Field label="Tipo" required>
                              <select
                                className="admin-select"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).type}
                                onChange={(event) =>
                                  updateProductDraft(
                                    item.id,
                                    "type",
                                    event.target.value as ImportedProductDraft["type"],
                                  )
                                }
                              >
                                <option value="RAW_MATERIAL">Materia-prima</option>
                                <option value="SERVICE">Servico</option>
                                <option value="FINISHED_PRODUCT">Produto final</option>
                                <option value="RESALE">Revenda</option>
                              </select>
                            </Field>

                            <Field label="Unidade interna" required>
                              <input
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).unit}
                                onChange={(event) =>
                                  updateProductDraft(item.id, "unit", normalizeUnitInput(event.target.value))
                                }
                                placeholder="un, pct, m2..."
                              />
                            </Field>

                            <Field label="Unidade de compra" optional>
                              <input
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).purchaseUnit}
                                onChange={(event) =>
                                  updateProductDraft(item.id, "purchaseUnit", normalizeUnitInput(event.target.value))
                                }
                                placeholder="cx, pct, resma..."
                              />
                            </Field>

                            <Field label="Fator de conversao" optional>
                              <QuantityInput
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).conversionFactor}
                                onChange={(value) => updateProductDraft(item.id, "conversionFactor", value)}
                              />
                            </Field>

                            <Field label="Controla estoque">
                              <label className="admin-readonly-box" style={{ justifyContent: "flex-start", gap: 10 }}>
                                <input
                                  type="checkbox"
                                  checked={(productDrafts[item.id] ?? createImportedProductDraft(item)).type === "SERVICE" ? false : (productDrafts[item.id] ?? createImportedProductDraft(item)).controlsStock}
                                  disabled={(productDrafts[item.id] ?? createImportedProductDraft(item)).type === "SERVICE"}
                                  onChange={(event) => updateProductDraft(item.id, "controlsStock", event.target.checked)}
                                />
                                <span>
                                  {(productDrafts[item.id] ?? createImportedProductDraft(item)).type === "SERVICE"
                                    ? "Servico nao controla estoque"
                                    : "Controlar estoque para este item"}
                                </span>
                              </label>
                            </Field>

                            <Field label="SKU" optional>
                              <input
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).sku}
                                onChange={(event) => updateProductDraft(item.id, "sku", normalizeSkuInput(event.target.value))}
                                placeholder="Codigo interno opcional"
                              />
                            </Field>

                            <Field label="EAN / GTIN" optional>
                              <input
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).barcode}
                                onChange={(event) => updateProductDraft(item.id, "barcode", normalizeGtinInput(event.target.value))}
                                inputMode="numeric"
                                placeholder="Codigo de barras opcional"
                              />
                            </Field>

                            <Field label="Custo inicial">
                              <MoneyInput
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).costPrice}
                                onChange={(value) => updateProductDraft(item.id, "costPrice", value)}
                              />
                            </Field>

                            <Field label="Preco de venda">
                              <MoneyInput
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).salePrice}
                                onChange={(value) => updateProductDraft(item.id, "salePrice", value)}
                              />
                            </Field>

                            <Field label="Margem desejada (%)" optional>
                              <PercentageInput
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).desiredMargin}
                                onChange={(value) => updateProductDraft(item.id, "desiredMargin", value)}
                              />
                            </Field>

                            <Field label="Estoque minimo" optional>
                              <QuantityInput
                                className="admin-input"
                                value={(productDrafts[item.id] ?? createImportedProductDraft(item)).minimumStock}
                                onChange={(value) => updateProductDraft(item.id, "minimumStock", value)}
                              />
                            </Field>
                          </div>

                          <div className="admin-row admin-row--between" style={{ marginTop: 16, gap: 12, flexWrap: "wrap" }}>
                            <label className="admin-list-card__subtitle" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={(productDrafts[item.id] ?? createImportedProductDraft(item)).saveSupplierMapping}
                                onChange={(event) => updateProductDraft(item.id, "saveSupplierMapping", event.target.checked)}
                              />
                              Salvar o vinculo fornecedor-item para as proximas importacoes
                            </label>

                            <div className="admin-row" style={{ gap: 10, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="admin-button admin-button--secondary"
                                onClick={() => setOpenProductDraftItemId(null)}
                              >
                                Fechar
                              </button>
                              <LoadingButton
                                type="button"
                                className="admin-button admin-button--ghost"
                                isLoading={creatingProductItemId === item.id}
                                loadingLabel="Cadastrando..."
                                onClick={() => handleCreateProductFromImportedItem(item.id)}
                              >
                                Criar e vincular item
                              </LoadingButton>
                            </div>
                          </div>
                        </FormSection>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!isImportedDraft ? (
                  <FormSection
                    title="Revisao comercial do item"
                    description="Use esta etapa para decidir como o novo custo influencia o preco de venda."
                    defaultOpen={
                      item.priceDecision !== "KEEP_CURRENT" ||
                      Boolean(item.decisionJustification.trim()) ||
                      parseCurrencyInput(item.customSalePrice) > 0
                    }
                  >
                    <div className="admin-form-grid admin-form-grid--4">
                      <Field label="Tratamento do preco">
                        <select
                          className="admin-select"
                          value={item.priceDecision}
                          onChange={(event) => updateItem(item.id, "priceDecision", event.target.value)}
                        >
                          <option value="KEEP_CURRENT">Manter preco atual</option>
                          <option value="APPLY_SUGGESTED">Aplicar preco sugerido</option>
                          <option value="CUSTOM_PRICE">Informar outro preco</option>
                        </select>
                      </Field>

                      <Field label="Novo preco de venda" optional>
                        <MoneyInput
                          className="admin-input"
                          value={item.customSalePrice}
                          onChange={(value) => updateItem(item.id, "customSalePrice", value)}
                          disabled={item.priceDecision !== "CUSTOM_PRICE"}
                        />
                      </Field>

                      <Field label="Justificativa" optional>
                        <input
                          className="admin-input"
                          value={item.decisionJustification}
                          onChange={(event) =>
                            updateItem(item.id, "decisionJustification", event.target.value)
                          }
                          placeholder="Opcional"
                        />
                      </Field>

                      <div className="admin-row" style={{ alignItems: "end", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="admin-button admin-button--danger"
                          onClick={() => removeItem(item.id)}
                        >
                          Remover item
                        </button>
                      </div>
                    </div>
                  </FormSection>
                ) : null}
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Etapa 3 - Financeiro e revisao"
          description="Antes de confirmar, revise o total, a condicao financeira e o impacto esperado desta entrada."
        >
          <div className="admin-page-stack">
            <div className="admin-form-grid admin-form-grid--3">
              <Field label="Condicao financeira">
                <select
                  className="admin-select"
                  value={form.financialCondition}
                  onChange={(event) =>
                    updateField("financialCondition", event.target.value as EntryFormState["financialCondition"])
                  }
                >
                  <option value="NONE">Sem lancamento financeiro</option>
                  <option value="CASH">A vista</option>
                  <option value="TERM">A prazo</option>
                </select>
              </Field>

              <Field
                label="Conta financeira"
                optional
                helpText="Obrigatoria somente quando a entrada gerar reflexo no financeiro."
              >
                <SearchableSelect
                  value={form.financialAccountId}
                  onChange={(value) => updateField("financialAccountId", value)}
                  options={accountOptions}
                  placeholder="Selecionar conta"
                  disabled={isLoadingOptions || form.financialCondition === "NONE"}
                  emptyMessage="Nenhuma conta encontrada."
                  clearable
                />
              </Field>

              {form.financialCondition === "TERM" ? (
                <Field label="Parcelas">
                  <input
                    className="admin-input"
                    value={form.installmentCount}
                    onChange={(event) =>
                    updateField(
                      "installmentCount",
                      event.target.value.replace(/\D/g, "").slice(0, 2) || "1",
                    )
                  }
                  inputMode="numeric"
                />
              </Field>
              ) : null}

              {form.financialCondition === "TERM" ? (
                <Field label="Primeiro vencimento">
                  <input
                    className="admin-input"
                    type="date"
                    value={form.firstDueDate}
                    onChange={(event) => updateField("firstDueDate", event.target.value)}
                  />
                </Field>
              ) : form.financialCondition === "CASH" ? (
                <Field label="Data da baixa financeira">
                  <input
                    className="admin-input"
                    type="date"
                    value={form.firstDueDate}
                    onChange={(event) => updateField("firstDueDate", event.target.value)}
                  />
                </Field>
              ) : null}
            </div>

            <Alert variant="info" title="Ao confirmar esta entrada">
              O estoque sera atualizado, as camadas FIFO serao criadas e o financeiro sera gerado quando a condicao escolhida exigir.
            </Alert>

            <div className="admin-surface-muted">
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Subtotal da entrada</span>
                <strong style={{ fontSize: 22 }}>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Condicao financeira</span>
                <strong>{formatFinancialCondition(form.financialCondition)}</strong>
              </div>
              <div className="admin-summary-row">
                <span style={{ color: "var(--muted)" }}>Itens no documento</span>
                <strong>{computedItems.length}</strong>
              </div>
            </div>

            {entrySnapshot?.financialEntries?.length ? (
              <div className="admin-page-stack">
                <strong>Financeiro gerado</strong>
                <div className="admin-list-stack">
                  {entrySnapshot.financialEntries.map((financialEntry) => (
                    <article key={financialEntry.id} className="admin-list-card">
                      <div className="admin-row admin-row--between" style={{ gap: 12, alignItems: "center" }}>
                        <div className="admin-inline-stack">
                          <strong>{formatImportedFinancialEntryType(financialEntry.entryType)}</strong>
                          <span className="admin-list-card__subtitle">
                            {formatCurrency(financialEntry.amount)} | vencimento {formatDateOnly(financialEntry.dueDate)}
                            {financialEntry.installmentCount
                              ? ` | parcela ${financialEntry.installmentNumber ?? 1}/${financialEntry.installmentCount}`
                              : ""}
                          </span>
                        </div>
                        <div className="admin-row" style={{ gap: 10, flexWrap: "wrap" }}>
                          <StatusBadge
                            status={formatFinancialStatus(financialEntry.status)}
                            tone={mapFinancialTone(financialEntry.status)}
                          />
                          <Link
                            href={`/admin/financeiro/lancamentos/${financialEntry.id}`}
                            className="admin-link-button"
                          >
                            Abrir conta
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <StickyActionBar>
          <div className="admin-row">
            <Link href="/admin/estoque/entradas" className="admin-button admin-button--secondary">
              Voltar para entradas
            </Link>
            {mode === "edit" && entrySnapshot?.status === "DRAFT" ? (
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? "Confirmando..." : "Confirmar entrada"}
              </button>
            ) : null}
            {mode === "edit" && entrySnapshot?.status === "CONFIRMED" ? (
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={handleCancelConfirmedEntry}
                disabled={isCanceling}
              >
                {isCanceling ? "Cancelando..." : "Cancelar entrada confirmada"}
              </button>
            ) : null}
          </div>

          <LoadingButton
            type="submit"
            isLoading={isSubmitting}
            loadingLabel="Salvando..."
            disabled={
              isLoadingOptions ||
              entrySnapshot?.status === "CONFIRMED" ||
              entrySnapshot?.status === "CANCELED"
            }
          >
            {mode === "create"
              ? "Salvar entrada"
              : isImportedDraft
                ? "Salvar revisao"
                : "Salvar alteracoes"}
          </LoadingButton>
        </StickyActionBar>
      </form>
    </div>
  );
}

function SmallFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-inline-stack">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatFinancialCondition(value: EntryFormState["financialCondition"]) {
  if (value === "CASH") return "A vista";
  if (value === "TERM") return "A prazo";
  return "Sem financeiro";
}

function formatEntryStatus(value: "DRAFT" | "CONFIRMED" | "CANCELED") {
  if (value === "CONFIRMED") return "Confirmada";
  if (value === "CANCELED") return "Cancelada";
  return "Rascunho";
}

function entryTypeAllowsZeroCost(value: EntryFormState["entryType"]) {
  return value === "BONUS";
}

function formatAccountType(value: string) {
  const labels: Record<string, string> = {
    CASH: "Caixa",
    BANK: "Banco",
    DIGITAL_WALLET: "Carteira digital",
  };

  return labels[value] ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMatchStatus(value?: string | null) {
  if (value === "MATCHED") return "Conciliado";
  if (value === "SUGGESTED") return "Sugestao";
  return "Pendente";
}

function formatAttachmentDocumentType(value?: string | null) {
  if (value === "XML_NFE") return "XML NF-e";
  if (value === "DANFE_PDF") return "DANFE PDF";
  if (value === "BOLETO") return "Boleto";
  if (value === "PAYMENT_RECEIPT") return "Comprovante de pagamento";
  if (value === "RECEIPT") return "Recibo";
  if (value === "SUPPLIER_QUOTE") return "Orcamento do fornecedor";
  if (value === "MERCHANDISE_PHOTO") return "Foto da mercadoria";
  return "Documento operacional";
}

function formatFinancialStatus(value: string) {
  if (value === "PAID") return "Pago";
  if (value === "OVERDUE") return "Vencido";
  if (value === "CANCELED") return "Cancelado";
  return "Pendente";
}

function mapFinancialTone(value: string) {
  if (value === "PAID") return "success" as const;
  if (value === "OVERDUE") return "danger" as const;
  if (value === "CANCELED") return "neutral" as const;
  return "warning" as const;
}

function formatImportedFinancialEntryType(value: string) {
  if (value === "PAYABLE") return "Conta a pagar";
  if (value === "EXPENSE") return "Despesa paga";
  if (value === "RECEIVABLE") return "Conta a receber";
  if (value === "INCOME") return "Receita";
  return "Transferencia";
}

function matchStatusTone(value?: string | null) {
  if (value === "MATCHED") return "success" as const;
  if (value === "SUGGESTED") return "warning" as const;
  return "neutral" as const;
}

function canDeleteAttachment(
  entryStatus: EntryDetail["status"],
  attachment: NonNullable<EntryDetail["attachments"]>[number],
) {
  if (entryStatus === "CANCELED") {
    return false;
  }

  return !(attachment.source === "XML_IMPORT" && attachment.documentType === "XML_NFE");
}
