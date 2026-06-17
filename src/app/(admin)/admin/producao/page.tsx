"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import {
  normalizeDecimalInput,
  parseDecimalInput,
} from "@/lib/forms/br-utils";

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
  currentStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
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
  quantityProduced: number;
  totalCost: number;
  unitCost: number;
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
        const response = await fetch("/api/inventory/products", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<ProductOption[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os itens.");
          return;
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

    loadProducts();

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
            setErrorMessage(recipeResult.message ?? "Nao foi possivel carregar a ficha tecnica.");
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

    loadProductionContext();

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
        throw new Error(recipeResult.message ?? "Nao foi possivel atualizar a ficha tecnica.");
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
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section style={heroPanelStyle}>
        <div style={{ display: "grid", gap: 10, maxWidth: 840 }}>
          <p style={eyebrowStyle}>Operacao fabril</p>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Producao de itens
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Lance a producao dos produtos finais com consumo automatico das materias-primas e composicao do custo real por quantidade produzida.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/estoque" style={secondaryButtonStyle}>
            Ver estoque
          </Link>
          {selectedProductId ? (
            <Link href={`/admin/estoque/${selectedProductId}/composicao`} style={primaryButtonStyle}>
              Editar composicao
            </Link>
          ) : null}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <InfoCard label="Produtos finais" value={String(finishedProducts.length)} />
        <InfoCard label="Qtd simulada" value={formatNumber(simulatedQuantity)} />
        <InfoCard label="Custo total previsto" value={formatCurrency(estimatedTotalCost)} />
        <InfoCard label="Custo unitario previsto" value={formatCurrency(estimatedUnitCost)} accent />
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(380px, 0.95fr)",
          alignItems: "start",
        }}
      >
        <form onSubmit={handleSubmit} style={panelStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Apontar producao</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Escolha o produto final, simule o consumo da receita e confirme a producao quando estiver pronta para entrada em estoque.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.4fr 0.6fr" }}>
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
              <input
                value={quantityProduced}
                onChange={(event) => setQuantityProduced(normalizeDecimalInput(event.target.value))}
                inputMode="decimal"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Observacoes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Ex.: lote urgente, impressao reprocessada, ajuste fino de acabamento..."
              style={{ ...inputStyle, minHeight: 120, height: "auto", padding: 14 }}
            />
          </Field>

          {!selectedProduct ? (
            <div style={emptyStateStyle}>
              <strong>Selecione um produto final para iniciar.</strong>
              <span style={{ color: "var(--muted)" }}>
                Use um item do catalogo com tipo Produto final.
              </span>
            </div>
          ) : isLoadingRecipe ? (
            <div style={loadingPanelStyle}>
              <strong>Carregando ficha tecnica...</strong>
              <span style={{ color: "var(--muted)" }}>Estamos preparando a composicao para simular o consumo.</span>
            </div>
          ) : !recipe?.items.length ? (
            <div style={emptyStateStyle}>
              <strong>Esse produto ainda nao tem composicao.</strong>
              <span style={{ color: "var(--muted)" }}>
                Cadastre a ficha tecnica para permitir a baixa automatica de materia-prima.
              </span>
              <Link href={`/admin/estoque/${selectedProductId}/composicao`} style={secondaryButtonStyle}>
                Montar composicao
              </Link>
            </div>
          ) : (
            <section
              style={{
                display: "grid",
                gap: 12,
                padding: 18,
                borderRadius: 20,
                border: "1px solid rgba(232, 217, 202, 0.9)",
                background: "rgba(255,255,255,0.76)",
              }}
            >
              <div>
                <strong style={{ display: "block", marginBottom: 6 }}>Consumo previsto para o lote</strong>
                <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  Com base na receita cadastrada para {selectedProduct.name}.
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {estimatedConsumptions.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 0.8fr 0.8fr 0.8fr",
                      gap: 12,
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "#fff",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", marginBottom: 6 }}>{item.materialProductName}</strong>
                      <span style={{ color: "var(--muted)" }}>
                        Saldo atual {formatNumber(item.materialCurrentStock)} {item.materialUnit}
                      </span>
                    </div>
                    <div>
                      <strong style={{ display: "block", marginBottom: 6 }}>Consumo</strong>
                      <span>{formatNumber(item.quantityConsumed)} {item.materialUnit}</span>
                    </div>
                    <div>
                      <strong style={{ display: "block", marginBottom: 6 }}>Custo unit.</strong>
                      <span>{formatCurrency(item.materialCostPrice)}</span>
                    </div>
                    <div>
                      <strong style={{ display: "block", marginBottom: 6 }}>Custo total</strong>
                      <span>{formatCurrency(item.totalCost)}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div style={summaryPanelStyle}>
                <SummaryRow label="Quantidade do lote" value={formatNumber(simulatedQuantity)} />
                <SummaryRow label="Custo total previsto" value={formatCurrency(estimatedTotalCost)} />
                <SummaryRow label="Custo unitario previsto" value={formatCurrency(estimatedUnitCost)} strong />
              </div>
            </section>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              paddingTop: 10,
              borderTop: "1px solid rgba(232, 217, 202, 0.85)",
            }}
          >
            <button type="submit" disabled={isSubmitting || isLoadingRecipe} style={primaryButtonStyle}>
              {isSubmitting ? "Registrando..." : "Registrar producao"}
            </button>
          </div>
        </form>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Historico recente</h2>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                Ultimos apontamentos de producao para consulta de custo e consumo.
              </p>
            </div>
            {selectedProductId ? (
              <Link href={`/admin/estoque/${selectedProductId}/composicao`} style={secondaryButtonStyle}>
                Ajustar receita
              </Link>
            ) : null}
          </div>

          {isLoading || isLoadingRecipe ? (
            <div style={loadingPanelStyle}>
              <strong>Carregando historico...</strong>
              <span style={{ color: "var(--muted)" }}>Estamos consolidando as producoes recentes.</span>
            </div>
          ) : records.length === 0 ? (
            <div style={emptyStateStyle}>
              <strong>Nenhuma producao registrada ainda.</strong>
              <span style={{ color: "var(--muted)" }}>
                Assim que voce apontar um lote, ele aparecera aqui com consumo e custo.
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {records.map((record) => (
                <article
                  key={record.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 18,
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.82)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ display: "block", marginBottom: 6 }}>{record.productName}</strong>
                      <span style={{ color: "var(--muted)" }}>
                        {formatDate(record.createdAt)} | {record.producedByName ?? "Usuario interno"}
                      </span>
                    </div>
                    <div style={badgeStyle}>
                      {formatNumber(record.quantityProduced)} produzidos
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <MetricCard label="Custo total" value={formatCurrency(record.totalCost)} />
                    <MetricCard label="Custo unitario" value={formatCurrency(record.unitCost)} />
                    <MetricCard label="Itens consumidos" value={String(record.consumptions.length)} />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {record.consumptions.map((item) => (
                      <div
                        key={`${record.id}-${item.materialProductId}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: "rgba(245, 239, 231, 0.9)",
                        }}
                      >
                        <span>{item.materialProductName}</span>
                        <strong>
                          {formatNumber(item.quantityConsumed)} | {formatCurrency(item.totalCost)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  {record.notes ? (
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{record.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
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

function InfoCard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 22,
        background: accent ? "rgba(43, 110, 82, 0.12)" : "rgba(255,255,255,0.74)",
        border: "1px solid rgba(232, 217, 202, 0.9)",
      }}
    >
      <p style={cardEyebrowStyle(accent)}>{label}</p>
      <h2 style={{ margin: "10px 0 0", fontSize: 30 }}>{value}</h2>
    </article>
  );
}

function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(232, 217, 202, 0.9)",
        background: "rgba(255,255,255,0.74)",
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
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

const heroPanelStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  padding: 28,
  borderRadius: 28,
  background: "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
  border: "1px solid var(--border)",
  boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
} as const;

const panelStyle = {
  display: "grid",
  gap: 18,
  padding: 24,
  borderRadius: 24,
  border: "1px solid var(--border)",
  background: "var(--surface)",
} as const;

const summaryPanelStyle = {
  display: "grid",
  gap: 10,
  padding: 20,
  borderRadius: 20,
  border: "1px solid rgba(232, 217, 202, 0.9)",
  background: "linear-gradient(180deg, rgba(181,66,31,0.08), rgba(255,255,255,0.9))",
} as const;

const loadingPanelStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  padding: 42,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
} as const;

const emptyStateStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  textAlign: "center" as const,
  padding: 36,
  borderRadius: 22,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
} as const;

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
} as const;

function cardEyebrowStyle(accent?: boolean) {
  return {
    margin: 0,
    color: accent ? "#245844" : "var(--primary)",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: 12,
    fontWeight: 700,
  } as const;
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
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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

const badgeStyle = {
  padding: "10px 12px",
  borderRadius: 999,
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} as const;
