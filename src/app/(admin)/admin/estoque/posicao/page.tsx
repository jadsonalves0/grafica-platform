"use client";

import Link from "next/link";
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

type ProductListItem = {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT" | "RESALE";
  controlsStock: boolean;
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
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

export default function PosicaoEstoquePage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    async function loadProducts() {
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
          `/api/inventory/products${params.toString() ? `?${params.toString()}` : ""}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const result = (await response.json()) as ApiResult<ProductListItem[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar a posicao de estoque.");
          setProducts([]);
          return;
        }

        setProducts(result.data.filter((product) => product.controlsStock));
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar a posicao de estoque.");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadProducts, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search, categoryId]);

  const summary = useMemo(() => {
    const belowMinimum = products.filter((product) => product.currentStock <= product.minimumStock).length;
    const withoutStock = products.filter((product) => product.currentStock <= 0).length;
    const estimatedValue = products.reduce((sum, product) => sum + product.currentStock * product.costPrice, 0);

    return {
      trackedItems: products.length,
      belowMinimum,
      withoutStock,
      estimatedValue,
    };
  }, [products]);

  const selectedGroupName = groups.find((group) => group.id === categoryId)?.name;
  const activeFilters = [
    categoryId && selectedGroupName ? `Grupo: ${selectedGroupName}` : null,
  ].filter(Boolean) as string[];

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Estoque" }, { label: "Posicao de estoque" }]}
        title="Estoque"
        description="Consulte saldos, itens abaixo do minimo e valor estimado sem misturar isso com o cadastro do catalogo."
        primaryAction={{ href: "/admin/estoque/entradas", label: "Entradas" }}
        secondaryActions={[
          { href: "/admin/estoque/movimentar", label: "Movimentacoes", variant: "secondary" },
          { href: "/admin/producao", label: "Producao", variant: "secondary" },
        ]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Itens controlados" value={String(summary.trackedItems)} description="Produtos e materias-primas com saldo." />
        <MetricCard label="Abaixo do minimo" value={String(summary.belowMinimum)} description="Precisam de reposicao ou ajuste." />
        <MetricCard label="Sem saldo" value={String(summary.withoutStock)} description="Itens zerados ou negativos." />
        <MetricCard label="Valor estimado" value={formatCurrency(summary.estimatedValue)} description="Baseado no custo de referencia atual." />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o estoque.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Posicao atual"
        description="Pesquise por nome, SKU ou EAN/GTIN e filtre por grupo para encontrar rapidamente o item certo."
      >
        <FilterBar
          resultsCount={products.length}
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
            placeholder="Buscar por nome, SKU ou EAN/GTIN"
            label="Buscar por nome, SKU ou EAN/GTIN"
          />
          <label className="admin-field">
            <span className="admin-field__label">Grupo</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="admin-select">
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
        ) : products.length === 0 ? (
          <EmptyState
            title="Nenhum item com controle de estoque foi encontrado"
            description="Cadastre itens fisicos ou ajuste os filtros para visualizar a posicao operacional."
            action={{ href: "/admin/estoque/novo", label: "Cadastrar item" }}
          />
        ) : (
          <div className="admin-list-stack">
            {products.map((product) => {
              const isCritical = product.currentStock <= 0;
              const isLow = product.currentStock > 0 && product.currentStock <= product.minimumStock;
              const stockStatus = isCritical ? "Sem saldo" : isLow ? "Abaixo do minimo" : "Saudavel";

              return (
                <article key={product.id} className="admin-list-card">
                  <div className="admin-list-card__header">
                    <div className="admin-list-card__heading">
                      <strong className="admin-list-card__title">{product.name}</strong>
                      <span className="admin-list-card__subtitle">
                        {product.categoryName ?? "Sem grupo"} | {formatType(product.type)} | {product.unit}
                        {product.sku ? ` | SKU ${product.sku}` : ""}
                      </span>
                    </div>
                    <StatusBadge
                      status={stockStatus}
                      tone={isCritical ? "danger" : isLow ? "warning" : "success"}
                    />
                  </div>

                  <div className="admin-list-card__meta">
                    <InfoBox label="Saldo atual" value={`${formatNumber(product.currentStock)} ${product.unit}`} />
                    <InfoBox label="Estoque minimo" value={`${formatNumber(product.minimumStock)} ${product.unit}`} />
                    <InfoBox label="Custo ref." value={formatCurrency(product.costPrice)} />
                    <InfoBox label="Valor em estoque" value={formatCurrency(product.currentStock * product.costPrice)} />
                  </div>

                  <div className="admin-list-card__footer">
                    <span className="admin-list-card__hint">
                      Confira saldo, valor e necessidade de reposicao antes de movimentar ou produzir.
                    </span>
                    <div className="admin-row">
                      <Link href={`/admin/estoque/${product.id}`} className="admin-button admin-button--secondary">
                        Abrir item
                      </Link>
                      <Link
                        href={`/admin/estoque/movimentar?productId=${product.id}`}
                        className="admin-button admin-button--secondary"
                      >
                        Movimentar
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
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

function formatType(type: ProductListItem["type"]) {
  switch (type) {
    case "RAW_MATERIAL":
      return "Materia-prima";
    case "FINISHED_PRODUCT":
      return "Produto final";
    case "SERVICE":
      return "Servico";
    case "RESALE":
      return "Revenda";
    default:
      return type;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}
