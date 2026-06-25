"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import { PercentageInput, QuantityInput } from "@/components/forms/number-inputs";
import { Alert, PageHeader } from "@/components/admin/ui";
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
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
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
    materialSku?: string | null;
    materialCurrentStock: number;
    materialCostPrice: number;
    quantityPerUnit: number;
    lossPercent: number;
    notes?: string | null;
  }>;
};

type RecipeItemState = {
  id: string;
  materialProductId: string;
  quantityPerUnit: string;
  lossPercent: string;
  notes: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

function createEmptyRecipeItem(): RecipeItemState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    materialProductId: "",
    quantityPerUnit: "0",
    lossPercent: "0",
    notes: "",
  };
}

export default function ComposicaoProdutoPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<RecipeItemState[]>([createEmptyRecipeItem()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [recipeResponse, productsResponse] = await Promise.all([
          fetch(`/api/inventory/products/${productId}/recipe`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inventory/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const recipeResult = (await recipeResponse.json()) as ApiResult<RecipeDetail>;
        const productsResult = (await productsResponse.json()) as ApiResult<ProductOption[]>;

        if (!recipeResponse.ok || !recipeResult.success || !recipeResult.data) {
          setErrorMessage(recipeResult.message ?? "Nao foi possivel carregar a composicao.");
          return;
        }

        if (!productsResponse.ok || !productsResult.success || !productsResult.data) {
          setErrorMessage(productsResult.message ?? "Nao foi possivel carregar os itens do catalogo.");
          return;
        }

        setRecipe(recipeResult.data);
        setProducts(productsResult.data);
        setItems(
          recipeResult.data.items.length
            ? recipeResult.data.items.map((item) => ({
                id: item.id,
                materialProductId: item.materialProductId,
                quantityPerUnit: normalizeDecimalInput(String(item.quantityPerUnit)),
                lossPercent: normalizeDecimalInput(String(item.lossPercent)),
                notes: item.notes ?? "",
              }))
            : [createEmptyRecipeItem()],
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar a ficha tecnica do produto.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();

    return () => controller.abort();
  }, [productId]);

  const availableMaterials = useMemo(
    () =>
      products.filter(
        (product) =>
          product.id !== productId &&
          product.type !== "SERVICE" &&
          (product.isActive || items.some((item) => item.materialProductId === product.id)),
      ),
    [items, productId, products],
  );

  const materialLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      availableMaterials.map((product) => ({
        value: product.id,
        label: product.name,
        description: [
          product.sku ? `SKU ${product.sku}` : "Sem SKU",
          product.barcode ? `EAN ${product.barcode}` : "Sem EAN",
          `${formatType(product.type)} | ${product.unit}`,
          `Saldo ${formatNumber(product.currentStock)}`,
          `Custo ${formatCurrency(product.costPrice)}`,
        ].join(" | "),
        keywords: [product.sku ?? "", product.barcode ?? "", product.unit],
      })),
    [availableMaterials],
  );

  const simulatedItems = useMemo(
    () =>
      items.map((item) => {
        const material = availableMaterials.find((product) => product.id === item.materialProductId) ?? null;
        const rawQuantityPerUnit = item.quantityPerUnit;
        const rawLossPercent = item.lossPercent;
        const quantityPerUnit = parseDecimalInput(item.quantityPerUnit);
        const lossPercent = parseDecimalInput(item.lossPercent);
        const requiredQuantity = roundQuantity(quantityPerUnit * (1 + lossPercent / 100));
        const unitCost = material?.costPrice ?? 0;
        const totalCost = roundCurrency(requiredQuantity * unitCost);

        return {
          ...item,
          material,
          rawQuantityPerUnit,
          rawLossPercent,
          quantityPerUnit,
          lossPercent,
          requiredQuantity,
          unitCost,
          totalCost,
        };
      }),
    [availableMaterials, items],
  );

  const estimatedUnitCost = useMemo(
    () => roundCurrency(simulatedItems.reduce((sum, item) => sum + item.totalCost, 0)),
    [simulatedItems],
  );

  function updateItem(itemId: string, field: keyof RecipeItemState, value: string) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((current) => [...current, createEmptyRecipeItem()]);
  }

  function removeItem(itemId: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== itemId)));
  }

  function validateForm() {
    if (!recipe) {
      return "Nao foi possivel identificar o produto.";
    }

    if (recipe.product.type !== "FINISHED_PRODUCT") {
      return "Somente produtos finais podem receber ficha tecnica de producao.";
    }

    const selectedMaterials = new Set<string>();

    for (const [index, item] of items.entries()) {
      if (!item.materialProductId) {
        return `Selecione a materia-prima da linha ${index + 1}.`;
      }

      if (selectedMaterials.has(item.materialProductId)) {
        return "Nao repita a mesma materia-prima na composicao.";
      }

      selectedMaterials.add(item.materialProductId);

      if (parseDecimalInput(item.quantityPerUnit) <= 0) {
        return `Informe a quantidade consumida por unidade na linha ${index + 1}.`;
      }

      if (parseDecimalInput(item.lossPercent) < 0) {
        return `A perda da linha ${index + 1} nao pode ser negativa.`;
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

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/inventory/products/${productId}/recipe`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            materialProductId: item.materialProductId,
            quantityPerUnit: parseDecimalInput(item.quantityPerUnit),
            lossPercent: parseDecimalInput(item.lossPercent),
            notes: item.notes.trim() || undefined,
          })),
        }),
      });

      const result = (await response.json()) as ApiResult<RecipeDetail>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar a composicao.");
        return;
      }

      setRecipe(result.data);
      setItems(
        result.data.items.length
          ? result.data.items.map((item) => ({
              id: item.id,
              materialProductId: item.materialProductId,
              quantityPerUnit: normalizeDecimalInput(String(item.quantityPerUnit)),
              lossPercent: normalizeDecimalInput(String(item.lossPercent)),
              notes: item.notes ?? "",
            }))
          : [createEmptyRecipeItem()],
      );
      setSuccessMessage("Ficha tecnica salva com sucesso.");
    } catch {
      setErrorMessage("Falha ao salvar a composicao do produto.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
        <section style={loadingPanelStyle}>
          <strong>Carregando composicao...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos montando a ficha tecnica do produto.</span>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page-stack admin-page-shell admin-page-shell--wide">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Itens" }, { label: "Ficha tecnica" }]}
        title="Ficha tecnica do produto"
        description="Defina materiais, consumo padrao e perda prevista para orientar custo e producao do item final."
        primaryAction={{ href: `/admin/producao?productId=${productId}`, label: "Produzir item" }}
        secondaryActions={[{ href: `/admin/estoque/${productId}`, label: "Voltar para item", variant: "secondary" }]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel salvar a composicao.">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {recipe ? (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <InfoCard label="Produto final" value={recipe.product.name} />
            <InfoCard label="Unidade" value={recipe.product.unit} />
            <InfoCard label="Custo atual" value={formatCurrency(recipe.product.costPrice)} />
            <InfoCard label="Custo estimado por unidade" value={formatCurrency(estimatedUnitCost)} accent />
          </section>

          <form onSubmit={handleSubmit} style={formPanelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>Materiais e consumo padrao</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                  Informe quanto de cada materia-prima e consumido para produzir 1 {recipe.product.unit} do item final.
                </p>
              </div>

              <button type="button" onClick={addItem} style={secondaryButtonStyle}>
                Adicionar materia-prima
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {simulatedItems.map((item, index) => (
                <article
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.9fr 0.9fr auto",
                    gap: 12,
                    alignItems: "end",
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.86)",
                  }}
                >
                  <Field label={`Materia-prima ${index + 1}`} required>
                    <div style={{ display: "grid", gap: 8 }}>
                      <SearchableSelect
                        value={item.materialProductId}
                        onChange={(value) => updateItem(item.id, "materialProductId", value)}
                        options={materialLookupOptions}
                        placeholder="Pesquisar por nome, SKU ou EAN"
                        emptyMessage="Nenhuma materia-prima encontrada."
                        inputName={`recipeMaterialSearch-${index + 1}`}
                        ariaLabel={`Pesquisar materia-prima ${index + 1}`}
                      />
                      {item.material ? (
                        <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                          Estoque atual {formatNumber(item.material.currentStock)} {item.material.unit} | custo {formatCurrency(item.material.costPrice)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                          Selecione um item de estoque para compor o produto final.
                        </span>
                      )}
                    </div>
                  </Field>

                  <Field label="Qtde por unidade" required>
                    <QuantityInput
                      value={item.rawQuantityPerUnit}
                      onChange={(value) => updateItem(item.id, "quantityPerUnit", value)}
                      scale={4}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Perda (%)">
                    <PercentageInput
                      value={item.rawLossPercent}
                      onChange={(value) => updateItem(item.id, "lossPercent", value)}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Consumo total">
                    <div style={readonlyBoxStyle}>{formatNumber(item.requiredQuantity)}</div>
                  </Field>

                  <Field label="Custo na receita">
                    <div style={readonlyBoxStyle}>{formatCurrency(item.totalCost)}</div>
                  </Field>

                  <button type="button" onClick={() => removeItem(item.id)} style={dangerGhostButtonStyle}>
                    Remover
                  </button>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Observacoes">
                      <input
                        value={item.notes}
                        onChange={(event) => updateItem(item.id, "notes", event.target.value)}
                        placeholder="Ex.: margem extra para acerto, perda de corte..."
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                </article>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 320px",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 20,
                  border: "1px solid rgba(232, 217, 202, 0.9)",
                  background: "rgba(255,255,255,0.74)",
                }}
              >
                <strong style={{ display: "block", marginBottom: 10 }}>Leitura operacional</strong>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
                  O custo estimado soma o consumo de cada materia-prima para produzir 1 {recipe.product.unit} do item final, ja considerando a perda configurada em cada linha. Depois disso, a tela de producao usa esta ficha como base para baixa e custo realizado.
                </p>
              </div>

              <div style={summaryPanelStyle}>
                <SummaryRow label="Linhas na receita" value={String(simulatedItems.length)} />
                <SummaryRow label="Custo estimado por unidade" value={formatCurrency(estimatedUnitCost)} strong />
                <SummaryRow label="Custo atual cadastrado" value={formatCurrency(recipe.product.costPrice)} />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                paddingTop: 10,
                borderTop: "1px solid rgba(232, 217, 202, 0.85)",
              }}
            >
              <Link href={`/admin/estoque/${productId}`} style={secondaryButtonStyle}>
                Cancelar
              </Link>
              <button type="submit" disabled={isSaving} style={primaryButtonStyle}>
                {isSaving ? "Salvando..." : "Salvar composicao"}
              </button>
            </div>
          </form>
        </>
      ) : null}
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
    maximumFractionDigits: 4,
  }).format(value || 0);
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    RAW_MATERIAL: "Materia-prima",
    SERVICE: "Servico",
    FINISHED_PRODUCT: "Produto final",
  };

  return labels[type] ?? type;
}

function roundQuantity(value: number) {
  return Math.round(value * 10000) / 10000;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

const formPanelStyle = {
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
