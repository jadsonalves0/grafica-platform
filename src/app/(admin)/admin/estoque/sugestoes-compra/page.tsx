"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchField,
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

type GroupOption = {
  id: string;
  name: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function SugestoesCompraPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftingProductId, setDraftingProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroups() {
      try {
        const response = await fetch("/api/inventory/groups", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<GroupOption[]>;

        if (response.ok && result.success && result.data) {
          setGroups(result.data);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    void loadGroups();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSuggestions() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) {
          params.set("search", search.trim());
        }
        if (categoryId) {
          params.set("categoryId", categoryId);
        }

        const response = await fetch(
          `/api/inventory/purchase-suggestions${params.toString() ? `?${params.toString()}` : ""}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const result = (await response.json()) as ApiResult<PurchaseSuggestion[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar as sugestoes de compra.");
          setSuggestions([]);
          return;
        }

        setSuggestions(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar as sugestoes de compra.");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadSuggestions, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search, categoryId]);

  useEffect(() => {
    setSelectedProductIds((current) =>
      current.filter((productId) =>
        suggestions.some((item) => item.productId === productId),
      ),
    );
  }, [suggestions]);

  const summary = useMemo(() => {
    const mappedSuppliers = suggestions.filter((item) => item.hasRecentSupplierMapping).length;
    const missingSuppliers = suggestions.length - mappedSuppliers;
    const estimatedValue = suggestions.reduce(
      (sum, item) => sum + item.estimatedPurchaseValue,
      0,
    );
    const mismatched = suggestions.filter((item) => item.hasStockMismatch).length;

    return {
      total: suggestions.length,
      mappedSuppliers,
      missingSuppliers,
      estimatedValue,
      mismatched,
    };
  }, [suggestions]);

  const selectedGroupName = groups.find((group) => group.id === categoryId)?.name;
  const activeFilters = [
    categoryId && selectedGroupName ? `Grupo: ${selectedGroupName}` : null,
  ].filter(Boolean) as string[];
  const allVisibleSelected =
    suggestions.length > 0 &&
    suggestions.every((item) => selectedProductIds.includes(item.productId));

  function handleToggleSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((value) => value !== productId)
        : [...current, productId],
    );
  }

  function handleToggleSelectAllVisible() {
    setSelectedProductIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (productId) => !suggestions.some((item) => item.productId === productId),
        );
      }

      const merged = new Set(current);
      for (const item of suggestions) {
        merged.add(item.productId);
      }
      return [...merged];
    });
  }

  function handleOpenPurchaseList() {
    const params = new URLSearchParams();

    if (selectedProductIds.length > 0) {
      for (const productId of selectedProductIds) {
        params.append("productId", productId);
      }
    } else {
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (categoryId) {
        params.set("categoryId", categoryId);
      }
    }

    router.push(`/admin/estoque/lista-compra${params.toString() ? `?${params.toString()}` : ""}`);
  }

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
          result.message ??
            "Nao foi possivel gerar a pre-entrada a partir da sugestao de compra.",
        );
        return;
      }

      router.push(`/admin/estoque/entradas/${result.data.id}`);
      router.refresh();
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setErrorMessage("Falha ao gerar a pre-entrada da compra sugerida.");
    } finally {
      setDraftingProductId(null);
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Estoque" }, { label: "Sugestoes de compra" }]}
        title="Sugestoes de compra"
        description="Veja o que precisa de reposicao com base no estoque minimo e aproveite os vinculos recentes com fornecedor."
        primaryAction={{ href: "/admin/estoque/entradas/novo#importar-xml", label: "Importar XML" }}
        secondaryActions={[
          { href: "/admin/estoque/entradas/novo", label: "Nova entrada manual", variant: "secondary" },
          { href: "/admin/estoque/posicao", label: "Ver estoque", variant: "ghost" },
        ]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Itens para repor" value={String(summary.total)} description="Abaixo do estoque minimo." />
        <MetricCard label="Fornecedor sugerido" value={String(summary.mappedSuppliers)} description="Ja possuem mapeamento recente." />
        <MetricCard label="Sem fornecedor" value={String(summary.missingSuppliers)} description="Precisam de revisao operacional." />
        <MetricCard label="Compra estimada" value={formatCurrency(summary.estimatedValue)} description="Baseada no custo de referencia atual." />
      </section>

      {summary.mismatched ? (
        <Alert variant="warning" title={`${summary.mismatched} item(ns) com divergencia entre saldo e FIFO.`}>
          Revise esses itens antes de confiar plenamente na sugestao de compra, porque o saldo registrado ainda nao coincide com o saldo disponivel nas camadas.
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar as sugestoes de compra">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Reposicao sugerida"
        description="A lista abaixo usa estoque minimo, saldo disponivel e o ultimo vinculo conhecido com fornecedor para acelerar a compra."
        actions={
          <div className="admin-row">
            <span className="admin-section-card__caption">
              {selectedProductIds.length > 0
                ? `${selectedProductIds.length} item(ns) selecionado(s)`
                : "Nenhum item selecionado"}
            </span>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={handleToggleSelectAllVisible}
              disabled={suggestions.length === 0}
            >
              {allVisibleSelected ? "Limpar visiveis" : "Selecionar visiveis"}
            </button>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={handleOpenPurchaseList}
              disabled={suggestions.length === 0}
            >
              {selectedProductIds.length > 0 ? "Montar lista com selecionados" : "Montar lista filtrada"}
            </button>
          </div>
        }
      >
        <FilterBar
          resultsCount={suggestions.length}
          activeFilters={activeFilters}
          onClear={
            search || categoryId
              ? () => {
                  setSearch("");
                  setCategoryId("");
                }
              : undefined
          }
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar por item, SKU ou grupo"
            label="Buscar por item, SKU ou grupo"
          />
          <label className="admin-field">
            <span className="admin-field__label">Grupo</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="admin-select"
            >
              <option value="">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={8} />
        ) : suggestions.length === 0 ? (
          <EmptyState
            title="Nenhuma reposicao sugerida no momento"
            description="Os itens ativos com controle de estoque estao acima do minimo ou os filtros nao retornaram resultados."
            action={{ href: "/admin/estoque/posicao", label: "Abrir estoque" }}
          />
        ) : (
          <div className="admin-list-stack">
            {suggestions.map((item) => (
              <article key={item.productId} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <label className="admin-row admin-list-card__hint">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(item.productId)}
                        onChange={() => handleToggleSelection(item.productId)}
                      />
                      <span>Incluir na lista de compra</span>
                    </label>
                    <strong className="admin-list-card__title">{item.productName}</strong>
                    <span className="admin-list-card__subtitle">
                      {item.categoryName ?? "Sem grupo"} | saldo disponivel {formatNumber(item.availableStock)} {item.unit}
                    </span>
                  </div>
                  <StatusBadge
                    status={item.hasRecentSupplierMapping ? "Fornecedor sugerido" : "Revisar fornecedor"}
                    tone={item.hasRecentSupplierMapping ? "success" : "warning"}
                  />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox label="Estoque minimo" value={`${formatNumber(item.minimumStock)} ${item.unit}`} />
                  <InfoBox label="Falta repor" value={`${formatNumber(item.shortageQuantity)} ${item.unit}`} />
                  <InfoBox
                    label="Compra sugerida"
                    value={`${formatNumber(item.suggestedPurchaseQuantity)} ${item.purchaseUnit || item.unit}`}
                  />
                  <InfoBox label="Custo estimado" value={formatCurrency(item.estimatedPurchaseValue)} />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox
                    label="Fornecedor"
                    value={item.preferredSupplierName || "Sem fornecedor sugerido"}
                  />
                  <InfoBox
                    label="Codigo fornecedor"
                    value={item.supplierProductCode || "-"}
                  />
                  <InfoBox
                    label="Conversao"
                    value={
                      item.conversionFactor
                        ? `1 ${item.purchaseUnit || item.unit} = ${formatNumber(item.conversionFactor)} ${item.unit}`
                        : "-"
                    }
                  />
                  <InfoBox
                    label="Ultimo uso"
                    value={item.lastSupplierUseAt ? formatDate(item.lastSupplierUseAt) : "-"}
                  />
                </div>

                {item.preferredSupplierId ? (
                  <div className="admin-row" style={{ justifyContent: "flex-end" }}>
                    <Link href={`/admin/fornecedores/${item.preferredSupplierId}`} className="admin-link-button">
                      Abrir fornecedor
                    </Link>
                  </div>
                ) : null}

                {item.hasStockMismatch ? (
                  <Alert variant="warning" title="Saldo precisa de conciliacao">
                    O item ainda possui divergencia entre o saldo registrado e o saldo elegivel nas camadas. Revise isso antes de efetivar a compra.
                  </Alert>
                ) : null}

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Use a sugestao como ponto de partida. A entrada pode ser registrada manualmente ou por XML quando a nota chegar.
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
                    <Link href="/admin/estoque/entradas/novo" className="admin-button admin-button--secondary">
                      Registrar entrada
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
