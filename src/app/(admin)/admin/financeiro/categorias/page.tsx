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

type FinancialCategory = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function CategoriasFinanceirasPage() {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/financial/categories", {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<FinancialCategory[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar as categorias.");
          setCategories([]);
          return;
        }

        setCategories(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar as categorias.");
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, []);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) =>
      `${category.name} ${category.type}`.toLowerCase().includes(normalizedSearch),
    );
  }, [categories, search]);

  const stats = useMemo(() => {
    const income = categories.filter((category) => category.type === "INCOME").length;
    const expense = categories.filter((category) => category.type === "EXPENSE").length;
    const active = categories.filter((category) => category.isActive).length;

    return [
      { label: "Categorias", value: String(categories.length), description: "Base financeira ativa e historica." },
      { label: "Receitas", value: String(income), description: "Classificacoes para entradas financeiras." },
      { label: "Despesas", value: String(expense), description: "Classificacoes para saidas e custos." },
      { label: "Ativas", value: String(active), description: "Disponiveis para novos lancamentos." },
    ];
  }, [categories]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Categorias financeiras" }]}
        title="Categorias financeiras"
        description="Centralize categorias de receita e despesa para manter lancamentos e relatorios mais coerentes."
        primaryAction={{ href: "/admin/financeiro/categorias/nova", label: "Nova categoria" }}
      />

      <section className="admin-card-grid">
        {stats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.description}
          />
        ))}
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar as categorias.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Cadastro de categorias"
        description="Use a mesma base para lancamentos avulsos, recebimentos e despesas operacionais."
      >
        <FilterBar
          resultsCount={filteredCategories.length}
          onClear={search ? () => setSearch("") : undefined}
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar categoria"
            label="Buscar categoria"
          />
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            title="Nenhuma categoria encontrada"
            description="Cadastre a primeira categoria ou refine a busca."
            action={{ href: "/admin/financeiro/categorias/nova", label: "Cadastrar categoria" }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredCategories.map((category) => (
              <article key={category.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{category.name}</strong>
                    <span className="admin-list-card__subtitle">
                      Atualizada em {formatDate(category.updatedAt)}
                    </span>
                  </div>
                  <div className="admin-row">
                    <StatusBadge
                      status={category.type === "INCOME" ? "Receita" : "Despesa"}
                      tone={category.type === "INCOME" ? "success" : "danger"}
                    />
                    <StatusBadge
                      status={category.isActive ? "Ativa" : "Inativa"}
                      tone={category.isActive ? "success" : "neutral"}
                    />
                  </div>
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Revise tipo, disponibilidade e nomenclatura antes de usar em novos lancamentos.
                  </span>
                  <Link
                    href={`/admin/financeiro/categorias/${category.id}`}
                    className="admin-button admin-button--secondary"
                  >
                    Editar categoria
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
