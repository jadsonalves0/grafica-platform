"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
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
  formatCurrencyInput,
  formatCurrencyValue,
  normalizeDecimalInput,
  normalizeReferenceInput,
  normalizeUnitInput,
  parseCurrencyInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";

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
};

type EntryFormState = {
  entryType:
    | "PURCHASE_INVOICE"
    | "PURCHASE_WITHOUT_INVOICE"
    | "INITIAL_BALANCE"
    | "RETURN"
    | "BONUS"
    | "OTHER";
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

type EntryDetail = {
  id: string;
  companyId: string;
  entryType: EntryFormState["entryType"];
  supplierName?: string | null;
  documentNumber: string;
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
  items: Array<{
    id: string;
    productId: string;
    productName: string;
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

type EntryFormProps = {
  mode: "create" | "edit";
  entryId?: string;
  initialData?: EntryDetail;
};

const defaultState: EntryFormState = {
  entryType: "PURCHASE_INVOICE",
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
  };
}

function mapInitialDataToState(entry: EntryDetail): EntryFormState {
  return {
    entryType: entry.entryType,
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
            productId: item.productId,
            description: item.description,
            unit: item.unit,
            quantity: normalizeDecimalInput(String(item.quantity)),
            unitCost: formatCurrencyValue(item.unitCost),
            priceDecision: normalizePriceDecision(item.priceDecision),
            decisionJustification: item.decisionJustification ?? "",
            customSalePrice: formatCurrencyValue(item.customSalePrice ?? 0),
          }))
        : [createEmptyItem()],
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
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        const quantity = parseDecimalInput(item.quantity);
        const unitCost = parseCurrencyInput(item.unitCost);
        return {
          ...item,
          quantity,
          unitCost,
          subtotal: roundCurrency(quantity * unitCost),
        };
      }),
    [form.items],
  );

  const subtotal = useMemo(
    () => roundCurrency(computedItems.reduce((sum, item) => sum + item.subtotal, 0)),
    [computedItems],
  );

  function updateField<K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(itemId: string, field: keyof EntryItemState, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
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
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== itemId),
    }));
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
              description: product ? product.name : item.description,
              unit: product ? product.unit : item.unit,
              unitCost: product ? formatCurrencyValue(product.costPrice) : item.unitCost,
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

      if (parseCurrencyInput(item.unitCost) < 0) {
        return `Informe um custo unitario valido para o item ${index + 1}.`;
      }

      if (item.priceDecision === "CUSTOM_PRICE" && parseCurrencyInput(item.customSalePrice) <= 0) {
        return `Informe o novo preco de venda do item ${index + 1}.`;
      }
    }

    if (subtotal <= 0) {
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
        supplierName: form.supplierName.trim() || undefined,
        documentNumber: normalizeReferenceInput(form.documentNumber),
        entryDate: form.entryDate,
        notes: form.notes.trim() || undefined,
        financialCondition: form.financialCondition,
        financialAccountId: form.financialAccountId || undefined,
        installmentCount: form.financialCondition === "TERM" ? Number(form.installmentCount) : 1,
        firstDueDate: form.financialCondition !== "NONE" ? form.firstDueDate : undefined,
        items: form.items.map((item) => ({
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

      setSuccessMessage(mode === "create" ? "Entrada criada com sucesso." : "Entrada atualizada com sucesso.");

      window.setTimeout(() => {
        router.push(
          `/admin/estoque/entradas?feedback=${mode === "create" ? "entry-created" : "entry-updated"}`,
        );
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Falha ao salvar a entrada.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (mode !== "edit" || !entryId || initialData?.status !== "DRAFT") {
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

      router.push("/admin/estoque/entradas?feedback=entry-confirmed");
      router.refresh();
    } catch {
      setErrorMessage("Falha ao confirmar a entrada.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleCancelConfirmedEntry() {
    if (mode !== "edit" || !entryId || initialData?.status !== "CONFIRMED") {
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

      router.push("/admin/estoque/entradas?feedback=entry-canceled");
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
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {initialData ? (
        <div className="admin-card-grid">
          <MetricCard label="Status" value={formatEntryStatus(initialData.status)} />
          <MetricCard label="Criado em" value={formatDate(initialData.createdAt)} />
          <MetricCard label="Ultima atualizacao" value={formatDate(initialData.updatedAt)} />
        </div>
      ) : null}

      {initialData?.status === "CONFIRMED" ? (
        <Alert variant="success" title="Entrada confirmada">
          O estoque ja foi atualizado. Para desfazer esta operacao, use o cancelamento com justificativa.
        </Alert>
      ) : null}

      {initialData?.status === "CANCELED" ? (
        <Alert variant="warning" title="Entrada cancelada">
          {initialData.cancelReason
            ? `Motivo registrado: ${initialData.cancelReason}`
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

            <Field label="Fornecedor" optional>
              <input
                className="admin-input"
                value={form.supplierName}
                onChange={(event) => updateField("supplierName", event.target.value)}
                placeholder="Nome do fornecedor"
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
            <button type="button" className="admin-button admin-button--secondary" onClick={addItem}>
              Adicionar item
            </button>
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
                    <input
                      className="admin-input"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.id, "quantity", normalizeDecimalInput(event.target.value))
                      }
                      inputMode="decimal"
                    />
                  </Field>

                  <Field label="Custo unitario" required>
                    <input
                      className="admin-input"
                      value={item.unitCost}
                      onChange={(event) =>
                        updateItem(item.id, "unitCost", formatCurrencyInput(event.target.value))
                      }
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="Subtotal">
                    <div className="admin-readonly-box admin-readonly-box--emphasis">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </Field>
                </div>

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
                      <input
                        className="admin-input"
                        value={item.customSalePrice}
                        onChange={(event) =>
                          updateItem(item.id, "customSalePrice", formatCurrencyInput(event.target.value))
                        }
                        inputMode="numeric"
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
          </div>
        </SectionCard>

        <StickyActionBar>
          <div className="admin-row">
            <Link href="/admin/estoque/entradas" className="admin-button admin-button--secondary">
              Voltar para entradas
            </Link>
            {mode === "edit" && initialData?.status === "DRAFT" ? (
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? "Confirmando..." : "Confirmar entrada"}
              </button>
            ) : null}
            {mode === "edit" && initialData?.status === "CONFIRMED" ? (
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
              initialData?.status === "CONFIRMED" ||
              initialData?.status === "CANCELED"
            }
          >
            {mode === "create" ? "Salvar entrada" : "Salvar alteracoes"}
          </LoadingButton>
        </StickyActionBar>
      </form>
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
