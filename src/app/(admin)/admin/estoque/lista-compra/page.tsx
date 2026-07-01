"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "@/components/admin/ui";

type PurchaseSuggestion = {
  productId: string;
  productName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  unit: string;
  purchaseUnit?: string | null;
  conversionFactor?: number | null;
  currentStock: number;
  availableStock: number;
  minimumStock: number;
  shortageQuantity: number;
  suggestedPurchaseQuantity: number;
  costPrice: number;
  estimatedPurchaseValue: number;
  preferredSupplierId?: string | null;
  preferredSupplierName?: string | null;
  preferredSupplierDocument?: string | null;
  supplierProductCode?: string | null;
  hasRecentSupplierMapping: boolean;
  hasStockMismatch: boolean;
  lastSupplierUseAt?: string | null;
};

type PurchaseListGroup = {
  supplierId?: string | null;
  supplierName: string;
  supplierDocument?: string | null;
  hasMappedSupplier: boolean;
  itemsCount: number;
  estimatedPurchaseValue: number;
  items: PurchaseSuggestion[];
};

type PurchaseList = {
  generatedAt: string;
  selectionMode: "FILTERED" | "SELECTED";
  totalItems: number;
  totalGroups: number;
  estimatedPurchaseValue: number;
  missingSupplierItems: number;
  mismatchedItems: number;
  filters: {
    search?: string | null;
    categoryId?: string | null;
    productIds: string[];
  };
  groups: PurchaseListGroup[];
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function ListaCompraPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PurchaseList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftingProductId, setDraftingProductId] = useState<string | null>(null);
  const [draftingGroupKey, setDraftingGroupKey] = useState<string | null>(null);

  const requestQuery = useMemo(() => {
    const params = new URLSearchParams();
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const productIds = searchParams.getAll("productId");

    if (search?.trim()) {
      params.set("search", search.trim());
    }
    if (categoryId?.trim()) {
      params.set("categoryId", categoryId.trim());
    }
    for (const productId of productIds) {
      if (productId.trim()) {
        params.append("productId", productId.trim());
      }
    }

    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPurchaseList() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/inventory/purchase-suggestions/purchase-list${requestQuery ? `?${requestQuery}` : ""}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const result = (await response.json()) as ApiResult<PurchaseList>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel montar a lista de compra.");
          setData(null);
          return;
        }

        setData(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar a lista de compra.");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPurchaseList();

    return () => controller.abort();
  }, [requestQuery]);

  async function handleCreateDraft(productId: string) {
    setDraftingProductId(productId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/inventory/purchase-suggestions/${productId}/create-entry`,
        {
          method: "POST",
        },
      );
      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(
          result.message ?? "Nao foi possivel gerar a pre-entrada a partir da lista de compra.",
        );
        return;
      }

      router.push(`/admin/estoque/entradas/${result.data.id}`);
      router.refresh();
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setErrorMessage("Falha ao gerar a pre-entrada da lista de compra.");
    } finally {
      setDraftingProductId(null);
    }
  }

  async function handleCreateGroupDraft(group: PurchaseListGroup) {
    const groupKey = buildGroupKey(group);
    setDraftingGroupKey(groupKey);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/inventory/purchase-suggestions/purchase-list/create-entry",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productIds: group.items.map((item) => item.productId),
            supplierId: group.supplierId ?? "",
            supplierName: group.hasMappedSupplier ? group.supplierName : "",
            supplierDocument: group.supplierDocument ?? "",
          }),
        },
      );
      const result = (await response.json()) as ApiResult<{ id: string }>;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(
          result.message ??
            "Nao foi possivel gerar a pre-entrada do grupo selecionado.",
        );
        return;
      }

      router.push(`/admin/estoque/entradas/${result.data.id}`);
      router.refresh();
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setErrorMessage("Falha ao gerar a pre-entrada em lote para este fornecedor.");
    } finally {
      setDraftingGroupKey(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Estoque" }, { label: "Lista de compra" }]}
        title="Lista de compra"
        description="Revise os itens a repor, agrupe por fornecedor e use essa lista como apoio para efetivar a compra."
        primaryAction={{ label: "Imprimir lista", onClick: handlePrint }}
        secondaryActions={[
          { href: "/admin/estoque/sugestoes-compra", label: "Voltar para sugestoes", variant: "secondary" },
          { href: "/admin/estoque/entradas/novo", label: "Nova entrada manual", variant: "ghost" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel montar a lista de compra">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Montando lista de compra">
          <Skeleton lines={10} />
        </SectionCard>
      ) : !data || data.totalItems === 0 ? (
        <SectionCard>
          <EmptyState
            title="Nenhum item entrou na lista de compra"
            description="Revise os filtros ou volte para Sugestoes de compra para selecionar outros itens."
            action={{ href: "/admin/estoque/sugestoes-compra", label: "Abrir sugestoes de compra" }}
          />
        </SectionCard>
      ) : (
        <>
          <section className="admin-card-grid">
            <MetricCard label="Itens na lista" value={String(data.totalItems)} description={data.selectionMode === "SELECTED" ? "Somente itens selecionados." : "Baseado nos filtros aplicados."} />
            <MetricCard label="Fornecedores" value={String(data.totalGroups)} description="Agrupados para agilizar a compra." />
            <MetricCard label="Compra estimada" value={formatCurrency(data.estimatedPurchaseValue)} description="Total pela referencia atual de custo." />
            <MetricCard label="Sem fornecedor" value={String(data.missingSupplierItems)} description="Itens que ainda pedem revisao operacional." />
          </section>

          {data.mismatchedItems ? (
            <Alert variant="warning" title={`${data.mismatchedItems} item(ns) com saldo divergente`}>
              Revise esses itens antes de confiar plenamente na reposicao, porque o saldo registrado ainda nao coincide com o saldo elegivel nas camadas.
            </Alert>
          ) : null}

          {data.selectionMode === "SELECTED" ? (
            <Alert variant="info" title="Lista montada com itens selecionados">
              Esta lista usa apenas os itens marcados na tela de sugestoes.
            </Alert>
          ) : null}

          <div className="admin-list-stack">
            {data.groups.map((group) => (
              <SectionCard
                key={group.supplierId ?? `${group.supplierName}-${group.supplierDocument ?? "sem-documento"}`}
                title={group.supplierName}
                description={
                  group.supplierDocument
                    ? `Documento: ${formatDocument(group.supplierDocument)}`
                    : "Fornecedor ainda nao definido para este grupo."
                }
                actions={
                  <div className="admin-row">
                    <StatusBadge
                      status={group.hasMappedSupplier ? "Fornecedor sugerido" : "Revisar fornecedor"}
                      tone={group.hasMappedSupplier ? "success" : "warning"}
                    />
                    {group.supplierId ? (
                      <Link href={`/admin/fornecedores/${group.supplierId}`} className="admin-link-button">
                        Abrir fornecedor
                      </Link>
                    ) : null}
                    <span className="admin-section-card__caption">
                      {group.itemsCount} item(ns) | {formatCurrency(group.estimatedPurchaseValue)}
                    </span>
                    <button
                      type="button"
                      className="admin-button admin-button--primary"
                      onClick={() => void handleCreateGroupDraft(group)}
                      disabled={draftingGroupKey === buildGroupKey(group)}
                    >
                      {draftingGroupKey === buildGroupKey(group)
                        ? "Gerando pre-entrada do grupo..."
                        : "Gerar pre-entrada do grupo"}
                    </button>
                  </div>
                }
              >
                <div className="admin-list-stack">
                  {group.items.map((item) => (
                    <article key={item.productId} className="admin-list-card">
                      <div className="admin-list-card__header">
                        <div className="admin-list-card__heading">
                          <strong className="admin-list-card__title">{item.productName}</strong>
                          <span className="admin-list-card__subtitle">
                            {item.categoryName ?? "Sem grupo"} | saldo disponivel {formatNumber(item.availableStock)} {item.unit}
                          </span>
                        </div>
                        <StatusBadge
                          status={item.hasStockMismatch ? "Revisar saldo" : "Pronto para compra"}
                          tone={item.hasStockMismatch ? "warning" : "success"}
                        />
                      </div>

                      <div className="admin-list-card__meta">
                        <InfoBox label="Falta repor" value={`${formatNumber(item.shortageQuantity)} ${item.unit}`} />
                        <InfoBox label="Compra sugerida" value={`${formatNumber(item.suggestedPurchaseQuantity)} ${item.purchaseUnit || item.unit}`} />
                        <InfoBox label="Custo estimado" value={formatCurrency(item.estimatedPurchaseValue)} />
                        <InfoBox label="Codigo fornecedor" value={item.supplierProductCode || "-"} />
                      </div>

                      {item.conversionFactor ? (
                        <div className="admin-surface-muted">
                          <span className="admin-list-card__subtitle">Conversao de compra</span>
                          <strong>
                            1 {item.purchaseUnit || item.unit} = {formatNumber(item.conversionFactor)} {item.unit}
                          </strong>
                        </div>
                      ) : null}

                      <div className="admin-list-card__footer">
                        <span className="admin-list-card__hint">
                          Depois de negociar a compra, gere a pre-entrada ou registre a nota por XML.
                        </span>
                        <div className="admin-row">
                          <Link href={`/admin/estoque/${item.productId}`} className="admin-button admin-button--secondary">
                            Abrir item
                          </Link>
                          <button
                            type="button"
                            className="admin-button admin-button--primary"
                            onClick={() => void handleCreateDraft(item.productId)}
                            disabled={draftingProductId === item.productId}
                          >
                            {draftingProductId === item.productId ? "Gerando pre-entrada..." : "Gerar pre-entrada"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        </>
      )}
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
  }).format(value);
}

function formatDocument(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return value;
}

function buildGroupKey(group: PurchaseListGroup) {
  return (
    group.supplierId?.trim() ||
    group.supplierDocument?.trim() ||
    group.supplierName.trim() ||
    "__sem-fornecedor__"
  );
}
