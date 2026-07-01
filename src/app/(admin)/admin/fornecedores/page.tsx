"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type SupplierListItem = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  displayName: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  contactName?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
  createdAt: string;
};

type SuppliersResponse = {
  success: boolean;
  message?: string;
  data?: SupplierListItem[];
};

type StatusFilter = "all" | "active" | "inactive";

function readStatusFilter(value: string | null): StatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

export default function FornecedoresPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(readStatusFilter(searchParams.get("status")));
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setStatusFilter(readStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }

    if (statusFilter === "all") {
      params.delete("status");
    } else {
      params.set("status", statusFilter);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, search, searchParams, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSuppliers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const separator = query ? "&" : "?";
        const response = await fetch(`/api/suppliers${query}${separator}includeInactive=true`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as SuppliersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os fornecedores.");
          setSuppliers([]);
          return;
        }

        setSuppliers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Nao foi possivel carregar os fornecedores. Tente novamente.");
        setSuppliers([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadSuppliers, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  const filteredSuppliers = useMemo(() => {
    if (statusFilter === "active") {
      return suppliers.filter((supplier) => supplier.isActive);
    }

    if (statusFilter === "inactive") {
      return suppliers.filter((supplier) => !supplier.isActive);
    }

    return suppliers;
  }, [suppliers, statusFilter]);

  const stats = useMemo(() => {
    const activeSuppliers = suppliers.filter((supplier) => supplier.isActive);
    const withContact = suppliers.filter(
      (supplier) => supplier.email || supplier.phone || supplier.whatsapp,
    );
    const withDocument = suppliers.filter((supplier) => supplier.document);

    return [
      {
        label: "Fornecedores ativos",
        value: String(activeSuppliers.length),
        description: "Disponiveis para entradas, XML e sugestoes de compra.",
      },
      {
        label: "Fornecedores inativos",
        value: String(suppliers.length - activeSuppliers.length),
        description: "Preservados no historico, fora das novas operacoes.",
      },
      {
        label: "Com documento",
        value: String(withDocument.length),
        description: "Prontos para conciliacao mais precisa de NF-e.",
      },
      {
        label: "Com contato",
        value: String(withContact.length),
        description: "Cadastros com canal direto para compras e cobranca.",
      },
    ];
  }, [suppliers]);

  const feedbackMessage = useMemo(() => {
    const code = searchParams.get("feedback");
    const dictionary: Record<string, string> = {
      created: "Fornecedor cadastrado com sucesso.",
      updated: "Fornecedor atualizado com sucesso.",
      deleted: "Fornecedor excluido com sucesso.",
      deactivated: "Fornecedor inativado com sucesso.",
      activated: "Fornecedor reativado com sucesso.",
    };

    return code ? dictionary[code] ?? null : null;
  }, [searchParams]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Fornecedores"
        description="Centralize parceiros de compra, melhore a conciliacao de XML e reduza texto solto nas entradas."
        primaryAction={{ href: "/admin/fornecedores/novo", label: "Novo fornecedor" }}
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

      {feedbackMessage ? <Alert variant="success">{feedbackMessage}</Alert> : null}
      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel carregar os fornecedores.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard title="Base cadastrada">
        <FilterBar
          resultsCount={filteredSuppliers.length}
          activeFilters={statusFilter !== "all" ? [`Status: ${statusFilter === "active" ? "Ativos" : "Inativos"}`] : []}
          onClear={
            search || statusFilter !== "all"
              ? () => {
                  setSearch("");
                  setStatusFilter("all");
                }
              : undefined
          }
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar fornecedor, documento ou contato"
            label="Buscar fornecedor, documento ou contato"
          />
          <label className="admin-field">
            <span className="admin-field__label">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(readStatusFilter(event.target.value))}
              className="admin-select"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={6} />
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Comece pelos fornecedores mais recorrentes para acelerar entradas, XML e compras."
            action={{ href: "/admin/fornecedores/novo", label: "Cadastrar fornecedor" }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredSuppliers.map((supplier) => (
              <article key={supplier.id} className="admin-list-card">
                <div className="admin-row admin-row--between" style={{ gap: 16, alignItems: "start" }}>
                  <div className="admin-inline-stack">
                    <strong>{supplier.displayName}</strong>
                    <span className="admin-list-card__subtitle">
                      {[
                        supplier.document,
                        supplier.contactName,
                        supplier.city && supplier.state
                          ? `${supplier.city}/${supplier.state}`
                          : supplier.city || supplier.state || null,
                      ]
                        .filter(Boolean)
                        .join(" | ") || "Sem detalhes complementares"}
                    </span>
                  </div>
                  <StatusBadge status={supplier.isActive ? "Ativo" : "Inativo"} tone={supplier.isActive ? "success" : "neutral"} />
                </div>

                <div className="admin-list-card__meta">
                  <span>{supplier.tradeName ? `Razao social: ${supplier.legalName}` : supplier.legalName}</span>
                  {supplier.email ? <span>{supplier.email}</span> : null}
                  {supplier.whatsapp || supplier.phone ? <span>{supplier.whatsapp || supplier.phone}</span> : null}
                </div>

                <div className="admin-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                  <Link href={`/admin/fornecedores/${supplier.id}`} className="admin-link-button">
                    Abrir cadastro
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
