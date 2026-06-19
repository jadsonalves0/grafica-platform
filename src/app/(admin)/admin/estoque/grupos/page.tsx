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

type ItemGroup = {
  id: string;
  name: string;
  description?: string | null;
  defaultMargin?: number | null;
  showOnWebsite: boolean;
  isActive: boolean;
  productsCount: number;
  updatedAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function GruposItensPage() {
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroups() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const response = await fetch(`/api/inventory/groups${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<ItemGroup[]>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os grupos.");
          setGroups([]);
          return;
        }

        setGroups(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os grupos.");
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadGroups, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  const activeCount = useMemo(() => groups.filter((group) => group.isActive).length, [groups]);
  const websiteCount = useMemo(() => groups.filter((group) => group.showOnWebsite).length, [groups]);
  const linkedItemsCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.productsCount, 0),
    [groups],
  );

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Cadastros" }, { label: "Grupos de itens" }]}
        title="Grupos de itens"
        description="Organize o catalogo, defina margem padrao e controle o que aparece no website."
        primaryAction={{ href: "/admin/estoque/grupos/novo", label: "Novo grupo" }}
        secondaryActions={[{ href: "/admin/estoque", label: "Voltar para itens", variant: "secondary" }]}
      />

      <section className="admin-card-grid">
        <MetricCard label="Grupos ativos" value={String(activeCount)} description="Disponiveis para novos itens." />
        <MetricCard label="Total cadastrado" value={String(groups.length)} description="Estrutura comercial do catalogo." />
        <MetricCard label="No website" value={String(websiteCount)} description="Grupos visiveis em conteudo publico." />
        <MetricCard label="Itens vinculados" value={String(linkedItemsCount)} description="Produtos ligados aos grupos listados." />
      </section>

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar os grupos.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Cadastro de grupos"
        description="Pesquise por nome e mantenha a estrutura comercial do catalogo coerente."
      >
        <FilterBar
          resultsCount={groups.length}
          onClear={search ? () => setSearch("") : undefined}
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar grupo de itens"
            label="Buscar grupo de itens"
          />
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : groups.length === 0 ? (
          <EmptyState
            title="Nenhum grupo encontrado"
            description="Crie o primeiro grupo para organizar melhor o catalogo e o website."
            action={{ href: "/admin/estoque/grupos/novo", label: "Criar primeiro grupo" }}
          />
        ) : (
          <div className="admin-list-stack">
            {groups.map((group) => (
              <article key={group.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{group.name}</strong>
                    <span className="admin-list-card__subtitle">
                      {group.description || "Sem descricao"} | Atualizado em {formatDate(group.updatedAt)}
                    </span>
                  </div>
                  <StatusBadge
                    status={group.isActive ? "Ativo" : "Inativo"}
                    tone={group.isActive ? "success" : "neutral"}
                  />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox
                    label="Margem padrao"
                    value={
                      group.defaultMargin !== null && group.defaultMargin !== undefined
                        ? `${group.defaultMargin.toFixed(2).replace(".", ",")}%`
                        : "Nao definida"
                    }
                  />
                  <InfoBox
                    label="Website"
                    value={group.showOnWebsite ? "Visivel no website" : "Uso interno"}
                  />
                  <InfoBox label="Itens vinculados" value={`${group.productsCount} item(ns)`} />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Revise margem, descricao e publicacao para manter catalogo e website alinhados.
                  </span>
                  <Link href={`/admin/estoque/grupos/${group.id}`} className="admin-button admin-button--secondary">
                    Editar grupo
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

function InfoBox({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
