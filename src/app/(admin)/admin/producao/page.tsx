"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  Field,
  LoadingButton,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StickyActionBar,
} from "@/components/admin/ui";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import { QuantityInput } from "@/components/forms/number-inputs";
import {
  parseDecimalInput,
} from "@/lib/forms/br-utils";

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  currentStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

type OperationalSettings = {
  allowNegativeStock: boolean;
};

type RecipeDetail = {
  product: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    type: string;
    costPrice: number;
    currentStock: number;
  };
  items: Array<{
    id: string;
    materialProductId: string;
    materialProductName: string;
    materialUnit: string;
    materialCurrentStock: number;
    materialCostPrice: number;
    quantityPerUnit: number;
    lossPercent: number;
  }>;
};

type ProductionRecord = {
  id: string;
  productId: string;
  productName: string;
  orderId?: string | null;
  orderCode?: string | null;
  quantityProduced: number;
  totalCost: number;
  unitCost: number;
  status: "PENDING" | "IN_PRODUCTION" | "COMPLETED" | "CANCELED";
  notes?: string | null;
  createdAt: string;
  producedByName?: string | null;
  consumptions: Array<{
    materialProductId: string;
    materialProductName: string;
    quantityConsumed: number;
    unitCost: number;
    totalCost: number;
  }>;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function ProducaoPage() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get("productId") ?? "";

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [settings, setSettings] = useState<OperationalSettings | null>(null);
  const [quantityProduced, setQuantityProduced] = useState("1");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [productsResponse, settingsResponse] = await Promise.all([
          fetch("/api/inventory/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inventory/settings", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const result = (await productsResponse.json()) as ApiResult<ProductOption[]>;
        const settingsResult = (await settingsResponse.json()) as ApiResult<OperationalSettings>;

        if (!productsResponse.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os itens.");
          return;
        }

        if (settingsResponse.ok && settingsResult.success && settingsResult.data) {
          setSettings(settingsResult.data);
        }

        setProducts(result.data);
        const suggestedProductId =
          initialProductId && result.data.some((product) => product.id === initialProductId)
            ? initialProductId
            : result.data.find((product) => product.type === "FINISHED_PRODUCT" && product.isActive)?.id ?? "";

        setSelectedProductId((current) => current || suggestedProductId);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar o catalogo para producao.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, [initialProductId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProductionContext() {
      setIsLoadingRecipe(true);

      try {
        const [recordsResponse, recipeResponse] = await Promise.all([
          fetch(
            selectedProductId ? `/api/production?productId=${selectedProductId}` : "/api/production",
            {
              signal: controller.signal,
              cache: "no-store",
            },
          ),
          selectedProductId
            ? fetch(`/api/inventory/products/${selectedProductId}/recipe`, {
                signal: controller.signal,
                cache: "no-store",
              })
            : Promise.resolve(null),
        ]);

        const recordsResult = (await recordsResponse.json()) as ApiResult<ProductionRecord[]>;

        if (!recordsResponse.ok || !recordsResult.success || !recordsResult.data) {
          setErrorMessage(recordsResult.message ?? "Nao foi possivel carregar o historico de producao.");
          return;
        }

        setRecords(recordsResult.data);

        if (recipeResponse) {
          const recipeResult = (await recipeResponse.json()) as ApiResult<RecipeDetail>;

          if (!recipeResponse.ok || !recipeResult.success || !recipeResult.data) {
            setRecipe(null);
            setErrorMessage(recipeResult.message ?? "Nao foi possivel carregar a composicao.");
            return;
          }

          setRecipe(recipeResult.data);
        } else {
          setRecipe(null);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar os dados de producao.");
      } finally {
        setIsLoadingRecipe(false);
      }
    }

    void loadProductionContext();

    return () => controller.abort();
  }, [selectedProductId]);

  const finishedProducts = useMemo(
    () => products.filter((product) => product.type === "FINISHED_PRODUCT"),
    [products],
  );

  const productLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      finishedProducts.map((product) => ({
        value: product.id,
        label: product.name,
        description: [
          product.sku ? `SKU ${product.sku}` : "Sem SKU",
          product.barcode ? `EAN ${product.barcode}` : "Sem EAN",
          `${product.unit} | saldo ${formatNumber(product.currentStock)}`,
          `custo atual ${formatCurrency(product.costPrice)}`,
        ].join(" | "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit],
      })),
    [finishedProducts],
  );

  const simulatedQuantity = useMemo(
    () => Math.max(parseDecimalInput(quantityProduced), 0),
    [quantityProduced],
  );

  const estimatedConsumptions = useMemo(
    () =>
      (recipe?.items ?? []).map((item) => {
        const baseQuantity = simulatedQuantity * item.quantityPerUnit;
        const quantityConsumed = roundQuantity(baseQuantity * (1 + item.lossPercent / 100));
        const totalCost = roundCurrency(quantityConsumed * item.materialCostPrice);

        return {
          ...item,
          quantityConsumed,
          totalCost,
        };
      }),
    [recipe?.items, simulatedQuantity],
  );

  const estimatedTotalCost = useMemo(
    () => roundCurrency(estimatedConsumptions.reduce((sum, item) => sum + item.totalCost, 0)),
    [estimatedConsumptions],
  );

  const estimatedUnitCost = useMemo(
    () => (simulatedQuantity > 0 ? roundCurrency(estimatedTotalCost / simulatedQuantity) : 0),
    [estimatedTotalCost, simulatedQuantity],
  );

  const shortageItems = useMemo(
    () =>
      estimatedConsumptions.filter(
        (item) =>
          item.materialCurrentStock < item.quantityConsumed &&
          !(settings?.allowNegativeStock ?? false),
      ),
    [estimatedConsumptions, settings?.allowNegativeStock],
  );

  const productionBuckets = useMemo(
    () => ({
      pending: records.filter((record) => record.status === "PENDING").length,
      inProgress: records.filter((record) => record.status === "IN_PRODUCTION").length,
      completed: records.filter((record) => record.status === "COMPLETED").length,
      blocked: shortageItems.length > 0 ? 1 : 0,
    }),
    [records, shortageItems.length],
  );

  const selectedProduct = finishedProducts.find((product) => product.id === selectedProductId) ?? null;

  async function refreshContext(productId = selectedProductId) {
    const [recordsResponse, recipeResponse] = await Promise.all([
      fetch(productId ? `/api/production?productId=${productId}` : "/api/production", {
        cache: "no-store",
      }),
      productId
        ? fetch(`/api/inventory/products/${productId}/recipe`, {
            cache: "no-store",
          })
        : Promise.resolve(null),
    ]);

    const recordsResult = (await recordsResponse.json()) as ApiResult<ProductionRecord[]>;

    if (!recordsResponse.ok || !recordsResult.success || !recordsResult.data) {
      throw new Error(recordsResult.message ?? "Nao foi possivel atualizar o historico de producao.");
    }

    setRecords(recordsResult.data);

    if (recipeResponse) {
      const recipeResult = (await recipeResponse.json()) as ApiResult<RecipeDetail>;

      if (!recipeResponse.ok || !recipeResult.success || !recipeResult.data) {
        throw new Error(recipeResult.message ?? "Nao foi possivel atualizar a composicao.");
      }

      setRecipe(recipeResult.data);
    }

    const productsResponse = await fetch("/api/inventory/products", { cache: "no-store" });
    const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;
    if (productsResponse.ok && productsResult.success && productsResult.data) {
      setProducts(productsResult.data);
    }
  }

  function validateForm() {
    if (!selectedProductId) {
      return "Selecione um produto final para produzir.";
    }

    if (!recipe?.items.length) {
      return "Cadastre a composicao do produto antes de apontar a producao.";
    }

    if (simulatedQuantity <= 0) {
      return "Informe uma quantidade produzida maior que zero.";
    }

    if (shortageItems.length > 0) {
      const firstShortage = shortageItems[0];
      return `Nao e possivel iniciar esta producao. Faltam ${formatNumber(
        roundQuantity(firstShortage.quantityConsumed - firstShortage.materialCurrentStock),
      )} ${firstShortage.materialUnit} de ${firstShortage.materialProductName}.`;
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
      const response = await fetch("/api/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProductId,
          quantityProduced: simulatedQuantity,
          notes: notes.trim() || undefined,
        }),
      });

      const result = (await response.json()) as ApiResult<ProductionRecord>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel registrar a producao.");
        return;
      }

      await refreshContext(selectedProductId);
      setQuantityProduced("1");
      setNotes("");
      setSuccessMessage("Producao registrada com sucesso e estoque atualizado.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao registrar a producao.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Producoes"
        description="Aponte a producao dos itens finais com consumo previsto, custo estimado e historico recente."
        secondaryActions={[
          { href: "/admin/estoque/posicao", label: "Ver estoque", variant: "secondary" },
          ...(selectedProductId
            ? [{ href: `/admin/estoque/${selectedProductId}/composicao`, label: "Editar composicao", variant: "ghost" as const }]
            : []),
        ]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Produtos finais" value={String(finishedProducts.length)} />
        <MetricCard label="Pendentes" value={String(productionBuckets.pending)} description="Aguardando apontamento." />
        <MetricCard label="Em andamento" value={String(productionBuckets.inProgress)} description="Lotes em execucao." />
        <MetricCard label="Com impedimento" value={String(productionBuckets.blocked)} description="Falta de material no lote atual." />
        <MetricCard label="Concluidas" value={String(productionBuckets.completed)} description="Producoes ja finalizadas." />
      </section>

      {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {shortageItems.length > 0 ? (
        <Alert variant="danger" title="Nao e possivel iniciar esta producao.">
          {`Faltam ${formatNumber(
            roundQuantity(shortageItems[0].quantityConsumed - shortageItems[0].materialCurrentStock),
          )} ${shortageItems[0].materialUnit} de ${shortageItems[0].materialProductName}.`}
          {" "}
          Revise o estoque antes de continuar.
        </Alert>
      ) : null}

      <div className="admin-layout-grid admin-layout-grid--sidebar">
        <form onSubmit={handleSubmit} className="admin-page-stack">
          <SectionCard
            title="Apontar producao"
            description="Escolha o produto final, informe a quantidade e revise os materiais necessarios antes de registrar."
          >
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.2fr) minmax(180px, 0.8fr)" }}>
              <Field label="Produto final" required>
                <SearchableSelect
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  options={productLookupOptions}
                  placeholder="Pesquisar produto final por nome, SKU ou EAN"
                  disabled={isLoading}
                  emptyMessage="Nenhum produto final encontrado."
                />
              </Field>

              <Field label="Quantidade produzida" required>
                <QuantityInput
                  value={quantityProduced}
                  onChange={setQuantityProduced}
                  className="admin-input"
                />
              </Field>
            </div>

            <Field label="Observacoes" optional>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Ex.: lote urgente, reimpressao, ajuste de acabamento."
                className="admin-textarea"
              />
            </Field>
          </SectionCard>

          <SectionCard
            title="Materiais necessarios"
            description="Resumo da composicao usada no lote atual e impacto previsto de custo."
          >
            {!selectedProduct ? (
              <EmptyState
                title="Selecione um produto final"
                description="Use um item do catalogo com tipo Produto final para carregar a composicao."
              />
            ) : isLoadingRecipe ? (
              <Skeleton lines={6} />
            ) : !recipe?.items.length ? (
              <EmptyState
                title="Esse produto ainda nao tem composicao"
                description="Cadastre a ficha tecnica para permitir a baixa automatica de materia-prima."
                action={{ href: `/admin/estoque/${selectedProductId}/composicao`, label: "Montar composicao" }}
              />
            ) : (
              <div className="admin-list-stack">
                {estimatedConsumptions.map((item) => (
                  <article key={item.id} className="admin-list-card">
                    <div className="admin-list-card__header">
                      <div className="admin-list-card__heading">
                        <strong className="admin-list-card__title">{item.materialProductName}</strong>
                        <span className="admin-list-card__subtitle">
                          Saldo atual {formatNumber(item.materialCurrentStock)} {item.materialUnit}
                        </span>
                      </div>
                      <strong className="admin-list-card__title">{formatCurrency(item.totalCost)}</strong>
                    </div>

                    <div className="admin-list-card__meta">
                      <SmallStat label="Consumo" value={`${formatNumber(item.quantityConsumed)} ${item.materialUnit}`} />
                      <SmallStat label="Custo unit." value={formatCurrency(item.materialCostPrice)} />
                      <SmallStat label="Perda aplicada" value={`${formatNumber(item.lossPercent)}%`} />
                    </div>

                    {item.materialCurrentStock < item.quantityConsumed && !(settings?.allowNegativeStock ?? false) ? (
                      <Alert variant="warning" title="Material abaixo do necessario para este lote.">
                        Faltam {formatNumber(roundQuantity(item.quantityConsumed - item.materialCurrentStock))} {item.materialUnit} para concluir a producao sem estoque negativo.
                      </Alert>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <StickyActionBar>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ fontSize: 16 }}>Resumo do lote</strong>
              <span style={{ color: "var(--admin-text-muted)" }}>
                {formatNumber(simulatedQuantity)} produzidos | custo total {formatCurrency(estimatedTotalCost)}
              </span>
            </div>
            <LoadingButton
              isLoading={isSubmitting}
              loadingLabel="Concluindo producao..."
              type="submit"
              disabled={shortageItems.length > 0}
            >
              Concluir producao
            </LoadingButton>
          </StickyActionBar>
        </form>

        <SectionCard
          title="Historico e proxima acao"
          description="Ultimos apontamentos e orientacao do que fazer em seguida."
          actions={
            selectedProductId ? (
              <Link href={`/admin/estoque/${selectedProductId}/composicao`} className="admin-button admin-button--ghost">
                Abrir ficha tecnica
              </Link>
            ) : null
          }
        >
          {isLoading || isLoadingRecipe ? (
            <Skeleton lines={6} />
          ) : records.length === 0 ? (
            <EmptyState
              title="Nenhuma producao registrada"
              description="Assim que voce apontar um lote, ele aparecera aqui com custo e consumo."
            />
          ) : (
            <div className="admin-list-stack">
              {records.map((record) => (
                <article key={record.id} className="admin-list-card">
                  <div className="admin-list-card__header">
                    <div className="admin-list-card__heading">
                      <strong className="admin-list-card__title">{record.productName}</strong>
                      <span className="admin-list-card__subtitle">
                        {formatDate(record.createdAt)} | {record.producedByName ?? "Usuario interno"}
                      </span>
                    </div>
                    <span className="admin-status-badge admin-status-badge--info">
                      {formatNumber(record.quantityProduced)} produzidos
                    </span>
                  </div>

                  <div className="admin-list-card__meta">
                    <SmallStat label="Custo total" value={formatCurrency(record.totalCost)} />
                    <SmallStat label="Custo unit." value={formatCurrency(record.unitCost)} />
                    <SmallStat label="Materiais" value={String(record.consumptions.length)} />
                  </div>

                  <div className="admin-row">
                    {record.orderCode ? (
                      <Link href={`/admin/pedidos/${record.orderId}`} className="admin-link-button">
                        Abrir pedido {record.orderCode}
                      </Link>
                    ) : null}
                    {selectedProductId ? (
                      <Link href={`/admin/estoque/${selectedProductId}`} className="admin-link-button">
                        Abrir item
                      </Link>
                    ) : null}
                  </div>

                  <div className="admin-list-stack">
                    {record.consumptions.map((item) => (
                      <div key={`${record.id}-${item.materialProductId}`} className="admin-surface-muted">
                        <span>{item.materialProductName}</span>
                        <strong>
                          {formatNumber(item.quantityConsumed)} | {formatCurrency(item.totalCost)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  {record.notes ? (
                    <p className="admin-list-card__hint" style={{ margin: 0 }}>{record.notes}</p>
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

function SmallStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
