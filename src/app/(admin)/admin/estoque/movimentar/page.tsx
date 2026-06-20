"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import { MoneyInput, QuantityInput } from "@/components/forms/number-inputs";
import {
  Alert,
  EmptyState,
  Field,
  LoadingButton,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";
import {
  normalizeReferenceInput,
  parseCurrencyInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  currentStock: number;
  availableStock: number;
  hasStockMismatch: boolean;
  unit: string;
};

type MovementReasonCode =
  | "ADJUSTMENT_POSITIVE"
  | "ADJUSTMENT_NEGATIVE"
  | "LOSS"
  | "DAMAGE"
  | "INTERNAL_CONSUMPTION"
  | "SAMPLE"
  | "DIVERSE_INPUT"
  | "DIVERSE_OUTPUT"
  | "INITIAL_BALANCE"
  | "BONUS"
  | "RETURN";

type MovementListItem = {
  id: string;
  productId: string;
  productName: string;
  movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  status: string;
  reasonCode?: MovementReasonCode | null;
  reasonText?: string | null;
  quantity: number;
  unitCost: number | null;
  referenceType: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE" | "ENTRY" | "PRODUCTION" | null;
  referenceId?: string | null;
  notes?: string | null;
  occurredAt: string;
  createdAt: string;
};

type MovementFormState = {
  productId: string;
  movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  reasonCode: MovementReasonCode;
  reasonText: string;
  quantity: string;
  unitCost: string;
  referenceType: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE" | "ENTRY" | "PRODUCTION";
  referenceId: string;
  notes: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const reasonOptionsByMovementType: Record<
  MovementFormState["movementType"],
  Array<{ value: MovementReasonCode; label: string; description: string }>
> = {
  INPUT: [
    { value: "INITIAL_BALANCE", label: "Saldo inicial", description: "Abertura de estoque da operacao." },
    { value: "BONUS", label: "Bonificacao", description: "Recebimento sem custo comercial direto." },
    { value: "RETURN", label: "Devolucao", description: "Retorno de item ao estoque." },
    { value: "DIVERSE_INPUT", label: "Entrada diversa", description: "Entrada administrativa fora da rotina de compras." },
  ],
  OUTPUT: [
    { value: "LOSS", label: "Perda", description: "Material inutilizado ou descartado." },
    { value: "DAMAGE", label: "Avaria", description: "Item danificado sem reaproveitamento." },
    { value: "INTERNAL_CONSUMPTION", label: "Consumo interno", description: "Uso interno sem venda ou producao formal." },
    { value: "SAMPLE", label: "Amostra", description: "Uso comercial para demonstracao." },
    { value: "DIVERSE_OUTPUT", label: "Saida diversa", description: "Saida administrativa fora das rotinas normais." },
  ],
  ADJUSTMENT: [
    { value: "ADJUSTMENT_POSITIVE", label: "Ajuste positivo", description: "Correcao de saldo para cima." },
    { value: "ADJUSTMENT_NEGATIVE", label: "Ajuste negativo", description: "Correcao de saldo para baixo." },
  ],
};

function buildDefaultForm(productId = ""): MovementFormState {
  return {
    productId,
    movementType: "INPUT",
    reasonCode: "DIVERSE_INPUT",
    reasonText: "",
    quantity: "1",
    unitCost: "0,00",
    referenceType: "MANUAL",
    referenceId: "",
    notes: "",
  };
}

export default function MovimentarEstoquePage() {
  const searchParams = useSearchParams();
  const requestedProductId = searchParams.get("productId") ?? "";
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [form, setForm] = useState<MovementFormState>(buildDefaultForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [form.productId, products],
  );

  const productLookupOptions: SearchableSelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: [
      product.sku ? `SKU ${product.sku}` : "Sem SKU",
      product.barcode ? `EAN ${product.barcode}` : "Sem EAN",
      product.unit,
      `Vendavel ${formatNumber(product.availableStock)}`,
      `Registrado ${formatNumber(product.currentStock)}`,
    ].join(" | "),
    keywords: [product.sku ?? "", product.barcode ?? "", product.unit],
  }));

  const selectedReasonOptions = reasonOptionsByMovementType[form.movementType];
  const selectedReason = selectedReasonOptions.find((option) => option.value === form.reasonCode) ?? null;

  const visibleMovements = useMemo(() => {
    const base = form.productId
      ? movements.filter((movement) => movement.productId === form.productId)
      : movements;

    return base.slice(0, 12);
  }, [form.productId, movements]);

  const loadInventoryData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [productsResponse, movementsResponse] = await Promise.all([
        fetch("/api/inventory/products", { cache: "no-store" }),
        fetch("/api/inventory/movements", { cache: "no-store" }),
      ]);

      const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;
      const movementsResult = (await movementsResponse.json()) as ApiResult<MovementListItem[]>;

      if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
        setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens do estoque.");
        return;
      }

      if (!movementsResponse.ok || !movementsResult.success || !movementsResult.data) {
        setErrorMessage(movementsResult.message ?? "Nao foi possivel carregar as movimentacoes.");
        return;
      }

      const productList = productsResult.data;
      const preferredProductId =
        requestedProductId && productList.some((product) => product.id === requestedProductId)
          ? requestedProductId
          : form.productId && productList.some((product) => product.id === form.productId)
            ? form.productId
            : "";

      setProducts(productList);
      setMovements(movementsResult.data);
      setForm((current) => ({
        ...current,
        productId: preferredProductId,
      }));
    } catch {
      setErrorMessage("Falha ao carregar os dados do estoque.");
    } finally {
      setIsLoading(false);
    }
  }, [form.productId, requestedProductId]);

  useEffect(() => {
    void loadInventoryData();
  }, [loadInventoryData]);

  useEffect(() => {
    if (!requestedProductId) {
      return;
    }

    setForm((current) =>
      current.productId === requestedProductId
        ? current
        : {
            ...current,
            productId: requestedProductId,
          },
    );
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [requestedProductId]);

  function updateField<K extends keyof MovementFormState>(field: K, value: MovementFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateMovementType(movementType: MovementFormState["movementType"]) {
    const defaultReason = reasonOptionsByMovementType[movementType][0];

    setForm((current) => ({
      ...current,
      movementType,
      reasonCode: defaultReason.value,
      reasonText: current.reasonCode === defaultReason.value ? current.reasonText : "",
    }));
  }

  function validateForm() {
    if (!form.productId) {
      return "Selecione o item da movimentacao.";
    }

    if (!form.reasonCode) {
      return "Selecione o motivo da movimentacao.";
    }

    if (form.reasonText.trim().length < 4) {
      return "Descreva o motivo da movimentacao com pelo menos 4 caracteres.";
    }

    if (parseDecimalInput(form.quantity) <= 0) {
      return "Informe uma quantidade maior que zero.";
    }

    if ((form.movementType === "INPUT" || form.reasonCode === "ADJUSTMENT_POSITIVE") && parseCurrencyInput(form.unitCost) <= 0) {
      return "Informe o custo unitario para entradas e ajustes positivos.";
    }

    if (form.unitCost && parseCurrencyInput(form.unitCost) < 0) {
      return "O custo unitario nao pode ser negativo.";
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
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: form.productId,
          movementType: form.movementType,
          reasonCode: form.reasonCode,
          reasonText: form.reasonText.trim(),
          quantity: parseDecimalInput(form.quantity),
          unitCost: form.unitCost ? parseCurrencyInput(form.unitCost) : undefined,
          referenceType: form.referenceType,
          referenceId: form.referenceId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      const result = (await response.json()) as ApiResult<{ created: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel registrar a movimentacao.");
        return;
      }

      setSuccessMessage("Movimentacao registrada com sucesso.");
      setForm((current) => {
        const reset = buildDefaultForm(current.productId);
        return {
          ...reset,
          productId: current.productId,
          movementType: current.movementType,
          reasonCode: reasonOptionsByMovementType[current.movementType][0].value,
        };
      });
      await loadInventoryData();
    } catch {
      setErrorMessage("Falha ao registrar a movimentacao.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Estoque" }, { label: "Movimentacoes" }]}
        title="Movimentacoes"
        description="Use esta tela somente para ajustes administrativos. Vendas, entradas por documento e producao devem seguir seus proprios fluxos."
        secondaryActions={[{ href: "/admin/estoque/posicao", label: "Voltar para estoque", variant: "secondary" }]}
      />

      <Alert variant="info" title="Uso administrativo">
        Esta tela existe para ajuste operacional. Nao utilize aqui os fluxos de venda, entrada por documento ou producao.
      </Alert>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel concluir a movimentacao.">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <div className="admin-layout-grid admin-layout-grid--sidebar">
        <SectionCard
          title="Nova movimentacao administrativa"
          description="Informe o item, a natureza da ocorrencia, o motivo e a referencia opcional para manter a rastreabilidade."
        >
          {isLoading ? (
            <Skeleton lines={8} />
          ) : (
            <form onSubmit={handleSubmit} className="admin-page-stack">
              {selectedProduct ? (
                <div className="admin-surface-muted">
                  <div className="admin-row admin-row--between">
                    <div className="admin-inline-stack">
                      <strong>{selectedProduct.name}</strong>
                      <span className="admin-list-card__subtitle">
                        {selectedProduct.sku ? `SKU ${selectedProduct.sku} | ` : ""}
                        {selectedProduct.barcode ? `EAN ${selectedProduct.barcode} | ` : ""}
                        {selectedProduct.unit} | Saldo vendavel {formatNumber(selectedProduct.availableStock)} | Saldo registrado{" "}
                        {formatNumber(selectedProduct.currentStock)}
                      </span>
                    </div>
                    <Link href={`/admin/estoque/${selectedProduct.id}`} className="admin-button admin-button--ghost">
                      Abrir item
                    </Link>
                  </div>
                </div>
              ) : null}

              {selectedProduct?.hasStockMismatch ? (
                <Alert variant="warning" title="Saldo em regularizacao">
                  O saldo registrado do item nao coincide com o saldo vendavel por FIFO. Revise as entradas e a
                  regularizacao administrativa antes de usar este item como referencia operacional.
                </Alert>
              ) : null}

              <Field label="Item" required>
                <SearchableSelect
                  value={form.productId}
                  onChange={(value) => updateField("productId", value)}
                  options={productLookupOptions}
                  placeholder="Pesquisar item por nome, SKU ou EAN"
                  emptyMessage="Nenhum item cadastrado encontrado."
                  disabled={isLoading}
                  clearable
                />
              </Field>

              <div className="admin-form-grid admin-form-grid--2">
                <Field label="Natureza da movimentacao" required>
                  <select
                    value={form.movementType}
                    onChange={(event) => updateMovementType(event.target.value as MovementFormState["movementType"])}
                    className="admin-select"
                  >
                    <option value="INPUT">Entrada administrativa</option>
                    <option value="OUTPUT">Saida administrativa</option>
                    <option value="ADJUSTMENT">Ajuste de saldo</option>
                  </select>
                </Field>

                <Field label="Motivo padrao" required>
                  <select
                    value={form.reasonCode}
                    onChange={(event) => updateField("reasonCode", event.target.value as MovementReasonCode)}
                    className="admin-select"
                  >
                    {selectedReasonOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantidade" required>
                  <QuantityInput
                    value={form.quantity}
                    onChange={(value) => updateField("quantity", value)}
                    className="admin-input"
                    placeholder="1"
                  />
                </Field>

                <Field label="Custo unitario">
                  <MoneyInput
                    value={form.unitCost}
                    onChange={(value) => updateField("unitCost", value)}
                    className="admin-input"
                    placeholder="0,00"
                  />
                </Field>

                <Field label="Origem da referencia">
                  <select
                    value={form.referenceType}
                    onChange={(event) =>
                      updateField("referenceType", event.target.value as MovementFormState["referenceType"])
                    }
                    className="admin-select"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="PURCHASE">Compra</option>
                    <option value="ENTRY">Entrada</option>
                    <option value="ORDER">Pedido</option>
                    <option value="QUOTE">Orcamento</option>
                    <option value="PRODUCTION">Producao</option>
                  </select>
                </Field>

                <Field label="Codigo da referencia">
                  <input
                    value={form.referenceId}
                    onChange={(event) => updateField("referenceId", normalizeReferenceInput(event.target.value))}
                    className="admin-input"
                    placeholder="Ex.: AJ-000123"
                    maxLength={80}
                  />
                </Field>
              </div>

              <Alert variant="info">
                {selectedReason?.description || "Explique o motivo da movimentacao para manter a rastreabilidade."}
              </Alert>

              <Field label="Motivo detalhado" required>
                <textarea
                  value={form.reasonText}
                  onChange={(event) => updateField("reasonText", event.target.value)}
                  rows={3}
                  className="admin-textarea"
                  placeholder="Explique o motivo da movimentacao."
                />
              </Field>

              <Field label="Observacoes complementares" optional>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={4}
                  className="admin-textarea"
                  placeholder="Conferente, origem da divergencia, numero interno ou outra observacao complementar."
                />
              </Field>

              <div className="admin-row admin-row--between">
                <span className="admin-list-card__hint">
                  Saidas administrativas seguem FIFO e ficam registradas na trilha operacional.
                </span>
                <LoadingButton type="submit" isLoading={isSubmitting} loadingLabel="Registrando...">
                  Registrar movimentacao
                </LoadingButton>
              </div>
            </form>
          )}
        </SectionCard>

        <SectionCard
          title={selectedProduct ? "Historico do item selecionado" : "Ultimas movimentacoes"}
          description="Confira as ultimas ocorrencias antes de registrar um novo ajuste."
        >
          {isLoading ? (
            <Skeleton lines={8} />
          ) : visibleMovements.length === 0 ? (
            <EmptyState
              title="Nenhuma movimentacao encontrada"
              description="Selecione outro item ou registre o primeiro ajuste administrativo."
            />
          ) : (
            <div className="admin-list-stack">
              {visibleMovements.map((movement) => (
                <article key={movement.id} className="admin-list-card">
                  <div className="admin-list-card__header">
                    <div className="admin-list-card__heading">
                      <strong className="admin-list-card__title">{movement.productName}</strong>
                      <span className="admin-list-card__subtitle">
                        {formatDateTime(movement.occurredAt)} | {movement.reasonText || formatReasonCode(movement.reasonCode)}
                      </span>
                    </div>
                    <StatusBadge status={formatMovementType(movement.movementType)} tone={movementTone(movement.movementType)} />
                  </div>

                  <div className="admin-list-card__meta">
                    <InfoBox label="Quantidade" value={formatNumber(movement.quantity)} />
                    <InfoBox
                      label="Custo"
                      value={movement.unitCost !== null ? formatCurrency(movement.unitCost) : "Nao informado"}
                    />
                    <InfoBox
                      label="Referencia"
                      value={
                        movement.referenceType
                          ? `${formatReferenceType(movement.referenceType)}${movement.referenceId ? ` | ${movement.referenceId}` : ""}`
                          : "Sem referencia"
                      }
                    />
                  </div>

                  {movement.notes ? (
                    <span className="admin-list-card__hint">{movement.notes}</span>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}

function InfoBox({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMovementType(type: MovementListItem["movementType"]) {
  const labels: Record<MovementListItem["movementType"], string> = {
    INPUT: "Entrada",
    OUTPUT: "Saida",
    ADJUSTMENT: "Ajuste",
  };
  return labels[type];
}

function formatReferenceType(type: NonNullable<MovementListItem["referenceType"]>) {
  const labels: Record<NonNullable<MovementListItem["referenceType"]>, string> = {
    MANUAL: "Manual",
    ORDER: "Pedido",
    PURCHASE: "Compra",
    QUOTE: "Orcamento",
    ENTRY: "Entrada",
    PRODUCTION: "Producao",
  };
  return labels[type];
}

function formatReasonCode(reasonCode?: MovementReasonCode | null) {
  const allReasons = Object.values(reasonOptionsByMovementType).flat();
  return allReasons.find((option) => option.value === reasonCode)?.label ?? "Motivo nao informado";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function movementTone(type: MovementListItem["movementType"]) {
  const tones: Record<MovementListItem["movementType"], "success" | "danger" | "info"> = {
    INPUT: "success",
    OUTPUT: "danger",
    ADJUSTMENT: "info",
  };

  return tones[type];
}
