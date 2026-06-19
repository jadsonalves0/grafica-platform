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
  showOnWebsite: boolean;
  desiredMargin?: number | null;
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

type GroupOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type ProductsResponse = {
  success: boolean;
  message?: string;
  data?: ProductListItem[];
};

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        const query = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(`/api/inventory/products${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ProductsResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os itens.");
          setProducts([]);
          return;
        }

        setProducts(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os itens.");
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroups() {
      try {
        const response = await fetch("/api/inventory/groups", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ProductsResponse & { data?: GroupOption[] };

        if (!response.ok || !result.success || !result.data) {
          return;
        }

        setGroups(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    void loadGroups();

    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const lowStock = products.filter((product) => product.controlsStock && product.currentStock <= product.minimumStock).length;
    const productsShownOnWebsite = products.filter((product) => product.showOnWebsite).length;

    return [
      { label: "Itens encontrados", value: String(products.length), description: "Base usada nas operacoes." },
      { label: "Reposicao necessaria", value: String(lowStock), description: "Itens abaixo do minimo." },
      { label: "Exibidos no website", value: String(productsShownOnWebsite), description: "Prontos para divulgacao." },
      { label: "Grupos ativos", value: String(groups.filter((group) => group.isActive).length), description: "Organizacao atual do catalogo." },
    ];
  }, [groups, products]);

  const activeFilters = useMemo(() => {
    if (!categoryId) {
      return [];
    }

    return [`Grupo: ${groups.find((group) => group.id === categoryId)?.name ?? "Selecionado"}`];
  }, [categoryId, groups]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Itens"
        description="Mantenha a base de materiais, servicos, revenda e produtos finais da grafica."
        primaryAction={{ href: "/admin/estoque/novo", label: "Novo item" }}
        secondaryActions={[
          { href: "/admin/estoque/grupos", label: "Grupos de itens", variant: "secondary" },
          { href: "/admin/estoque/posicao", label: "Ver estoque", variant: "secondary" },
        ]}
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar o catalogo.">
          {errorMessage}
        </Alert>
      ) : null}

      <section className="admin-card-grid">
        {stats.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} description={stat.description} />
        ))}
      </section>

      <SectionCard title="Catalogo">
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
        ) : products.length === 0 ? (
          <EmptyState
            title="Nenhum item encontrado"
            description="Cadastre o primeiro item para comecar a montar o catalogo operacional da grafica."
            action={{ href: "/admin/estoque/novo", label: "Cadastrar primeiro item" }}
          />
        ) : (
          <div className="admin-list-stack">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/admin/estoque/${product.id}`}
                className="admin-list-card"
              >
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{product.name}</strong>
                    <span className="admin-list-card__subtitle">
                      {product.categoryName || "Sem grupo"} | {formatType(product.type)} | {product.unit}
                    </span>
                    <span className="admin-list-card__subtitle">
                      {product.sku ? `SKU ${product.sku}` : "Sem SKU"} | {product.barcode ? `EAN ${product.barcode}` : "Sem EAN"}
                    </span>
                  </div>
                  <div className="admin-row">
                    <StatusBadge status={product.isActive ? "Ativo" : "Inativo"} tone={product.isActive ? "success" : "neutral"} />
                    <StatusBadge
                      status={product.controlsStock ? (product.currentStock <= product.minimumStock ? "Reposicao" : "Estoque OK") : "Sem estoque"}
                      tone={!product.controlsStock ? "neutral" : product.currentStock <= product.minimumStock ? "warning" : "success"}
                    />
                  </div>
                </div>

                <div className="admin-list-card__meta">
                  <MiniMetric label="Preco de venda" value={formatCurrency(product.salePrice)} />
                  <MiniMetric label="Custo de referencia" value={formatCurrency(product.costPrice)} />
                  <MiniMetric label="Saldo atual" value={formatNumber(product.currentStock)} />
                  <MiniMetric label="Estoque minimo" value={formatNumber(product.minimumStock)} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatType(type: ProductListItem["type"]) {
  if (type === "RAW_MATERIAL") return "Materia-prima";
  if (type === "SERVICE") return "Servico";
  if (type === "RESALE") return "Revenda";
  return "Produto final";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
