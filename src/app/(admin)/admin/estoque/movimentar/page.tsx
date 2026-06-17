"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/forms/searchable-select";
import {
  formatCurrencyInput,
  normalizeDecimalInput,
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
  unit: string;
};

type MovementListItem = {
  id: string;
  productId: string;
  productName: string;
  movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  quantity: number;
  unitCost: number | null;
  referenceType: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE" | null;
  createdAt: string;
};

type MovementFormState = {
  productId: string;
  movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  quantity: string;
  unitCost: string;
  referenceType: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE";
  referenceId: string;
  notes: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const defaultForm: MovementFormState = {
  productId: "",
  movementType: "INPUT",
  quantity: "1",
  unitCost: "0,00",
  referenceType: "MANUAL",
  referenceId: "",
  notes: "",
};

export default function MovimentarEstoquePage() {
  const searchParams = useSearchParams();
  const requestedProductId = searchParams.get("productId") ?? "";
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [form, setForm] = useState<MovementFormState>(defaultForm);
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
      `${product.unit}`,
      `Saldo ${formatNumber(product.currentStock)}`,
    ].join(" • "),
    keywords: [product.sku ?? "", product.barcode ?? "", product.unit],
  }));

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

      setProducts(productList);
      setMovements(movementsResult.data);
      setForm((current) => {
        const currentExists = current.productId
          ? productList.some((product) => product.id === current.productId)
          : false;

        if (!currentExists && productList.length > 0) {
          return {
            ...current,
            productId: productList[0].id,
          };
        }

        return current;
      });
    } catch {
      setErrorMessage("Falha ao carregar os dados do estoque.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  function updateField<K extends keyof MovementFormState>(
    field: K,
    value: MovementFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!form.productId) {
      return "Selecione o item da movimentacao.";
    }

    if (parseDecimalInput(form.quantity) <= 0) {
      return "Informe uma quantidade maior que zero.";
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
          quantity: parseDecimalInput(form.quantity),
          unitCost: parseCurrencyInput(form.unitCost),
          referenceType: form.referenceType,
          referenceId: form.referenceId || undefined,
          notes: form.notes || undefined,
        }),
      });

      const result = (await response.json()) as ApiResult<{ created: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel registrar a movimentacao.");
        return;
      }

      setSuccessMessage("Movimentacao registrada com sucesso.");
      setForm((current) => ({
        ...defaultForm,
        productId: current.productId,
      }));
      await loadInventoryData();
    } catch {
      setErrorMessage("Falha ao registrar a movimentacao.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          padding: 28,
          borderRadius: 28,
          background:
            "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <p style={eyebrowStyle}>Controle de estoque</p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Movimentacoes
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Registre entradas, saidas e ajustes com referencia operacional e impacto direto no saldo do item.
            </p>
          </div>

          <Link href="/admin/estoque" style={secondaryLinkStyle}>
            Voltar para estoque
          </Link>
        </div>
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)",
          alignItems: "start",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 16,
            padding: 24,
            borderRadius: 24,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Nova movimentacao</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Use manual, compra, pedido ou orcamento como referencia para manter a rastreabilidade.
            </p>
          </div>

          {selectedProduct ? (
            <section
              style={{
                display: "grid",
                gap: 10,
                padding: 16,
                borderRadius: 18,
                border: "1px solid rgba(232, 217, 202, 0.9)",
                background: "rgba(255,255,255,0.76)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{selectedProduct.name}</strong>
                  <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                    {selectedProduct.sku ? `SKU ${selectedProduct.sku} | ` : ""}
                    {selectedProduct.barcode ? `EAN ${selectedProduct.barcode} | ` : ""}
                    {selectedProduct.unit} | Saldo atual {formatNumber(selectedProduct.currentStock)}
                  </span>
                </div>
                <Link href={`/admin/estoque/${selectedProduct.id}`} style={miniActionStyle}>
                  Abrir item
                </Link>
              </div>
            </section>
          ) : null}

          <Field label="Item" required>
            <SearchableSelect
              value={form.productId}
              onChange={(value) => updateField("productId", value)}
              options={productLookupOptions}
              placeholder="Pesquisar item por nome ou SKU"
              emptyMessage="Nenhum item cadastrado encontrado."
              disabled={isLoading}
            />
          </Field>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <Field label="Tipo de movimento" required>
              <select
                value={form.movementType}
                onChange={(event) =>
                  updateField(
                    "movementType",
                    event.target.value as MovementFormState["movementType"],
                  )
                }
                style={inputStyle}
              >
                <option value="INPUT">Entrada</option>
                <option value="OUTPUT">Saida</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </Field>

            <Field label="Quantidade" required>
              <input
            value={form.quantity}
            onChange={(event) =>
              updateField("quantity", normalizeDecimalInput(event.target.value))
            }
            inputMode="decimal"
            style={inputStyle}
            placeholder="1"
          />
            </Field>

            <Field label="Custo unitario">
              <input
                value={form.unitCost}
                onChange={(event) =>
                  updateField("unitCost", formatCurrencyInput(event.target.value))
                }
                style={inputStyle}
                inputMode="numeric"
                placeholder="0,00"
              />
            </Field>

            <Field label="Tipo de referencia">
              <select
                value={form.referenceType}
                onChange={(event) =>
                  updateField(
                    "referenceType",
                    event.target.value as MovementFormState["referenceType"],
                  )
                }
                style={inputStyle}
              >
                <option value="MANUAL">Manual</option>
                <option value="PURCHASE">Compra</option>
                <option value="ORDER">Pedido</option>
                <option value="QUOTE">Orcamento</option>
              </select>
            </Field>
          </div>

          <Field label="Codigo da referencia">
            <input
              value={form.referenceId}
              onChange={(event) =>
                updateField("referenceId", normalizeReferenceInput(event.target.value))
              }
              style={inputStyle}
              placeholder="Ex.: PED-000123"
              maxLength={80}
            />
          </Field>

          <Field label="Observacoes">
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={5}
              style={{ ...inputStyle, minHeight: 150, height: "auto", padding: 14 }}
              placeholder="Motivo da movimentacao, responsavel ou observacao complementar."
            />
          </Field>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              paddingTop: 10,
              borderTop: "1px solid rgba(232, 217, 202, 0.85)",
            }}
          >
            <button type="submit" disabled={isSubmitting || isLoading} style={primaryButtonStyle}>
              {isSubmitting ? "Registrando..." : "Registrar movimentacao"}
            </button>
          </div>
        </form>

        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 24,
            borderRadius: 24,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Ultimas movimentacoes</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Historico recente para conferencia rapida da operacao.
            </p>
          </div>

          {isLoading ? (
            <div style={loadingPanelStyle}>Carregando historico...</div>
          ) : movements.length === 0 ? (
            <div style={emptyPanelStyle}>Nenhuma movimentacao registrada ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {movements.slice(0, 12).map((movement) => (
                <article
                  key={movement.id}
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.78)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{movement.productName}</strong>
                    <span style={movementBadgeStyle(movement.movementType)}>
                      {formatMovementType(movement.movementType)}
                    </span>
                  </div>
                  <span style={{ color: "var(--muted)" }}>
                    Quantidade: {movement.quantity}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    Referencia: {movement.referenceType ? formatReferenceType(movement.referenceType) : "Sem referencia"}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    Data: {formatDateTime(movement.createdAt)}
                  </span>
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
  };
  return labels[type];
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

function movementBadgeStyle(type: MovementListItem["movementType"]) {
  const palette: Record<MovementListItem["movementType"], { background: string; color: string }> = {
    INPUT: { background: "rgba(43, 110, 82, 0.12)", color: "#245844" },
    OUTPUT: { background: "rgba(181, 66, 31, 0.12)", color: "#8a2e16" },
    ADJUSTMENT: { background: "rgba(50, 92, 168, 0.12)", color: "#204f8a" },
  };

  return {
    padding: "8px 12px",
    borderRadius: 999,
    background: palette[type].background,
    color: palette[type].color,
    fontWeight: 700,
  };
}

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
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

const miniActionStyle = {
  height: 38,
  padding: "0 14px",
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

const secondaryLinkStyle = {
  height: 46,
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

const loadingPanelStyle = {
  padding: 24,
  borderRadius: 18,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
  color: "var(--muted)",
} as const;

const emptyPanelStyle = {
  padding: 24,
  borderRadius: 18,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
  color: "var(--muted)",
} as const;
