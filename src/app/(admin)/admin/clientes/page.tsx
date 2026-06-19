"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
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

type CustomerListItem = {
  id: string;
  name: string;
  isActive: boolean;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
};

type CustomersResponse = {
  success: boolean;
  message?: string;
  data?: CustomerListItem[];
};

type StatusFilter = "all" | "active" | "inactive";

function readStatusFilter(value: string | null): StatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

export default function ClientesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    readStatusFilter(searchParams.get("status")),
  );
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
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

    async function loadCustomers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim()
          ? `?search=${encodeURIComponent(search.trim())}`
          : "";
        const separator = query ? "&" : "?";
        const response = await fetch(
          `/api/customers${query}${separator}includeInactive=true`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const result = (await response.json()) as CustomersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(
            result.message ?? "Nao foi possivel carregar os clientes.",
          );
          setCustomers([]);
          return;
        }

        setCustomers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage(
          "Nao foi possivel carregar os clientes. Tente novamente.",
        );
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = window.setTimeout(loadCustomers, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  const filteredCustomers = useMemo(() => {
    if (statusFilter === "active") {
      return customers.filter((customer) => customer.isActive);
    }

    if (statusFilter === "inactive") {
      return customers.filter((customer) => !customer.isActive);
    }

    return customers;
  }, [customers, statusFilter]);

  const stats = useMemo(() => {
    const activeCustomers = customers.filter((customer) => customer.isActive);
    const withContact = customers.filter(
      (customer) => customer.email || customer.phone || customer.whatsapp,
    );
    const withLocation = customers.filter(
      (customer) => customer.city || customer.state,
    );

    return [
      {
        label: "Clientes ativos",
        value: String(activeCustomers.length),
        description: "Disponiveis para novas vendas, pedidos e propostas.",
      },
      {
        label: "Clientes inativos",
        value: String(customers.length - activeCustomers.length),
        description: "Mantidos no historico, fora das novas operacoes.",
      },
      {
        label: "Com contato",
        value: String(withContact.length),
        description: "Cadastros com pelo menos um canal de comunicacao.",
      },
      {
        label: "Com localizacao",
        value: String(withLocation.length),
        description: "Cadastros com cidade ou estado preenchidos.",
      },
    ];
  }, [customers]);

  const feedbackMessage = useMemo(() => {
    const code = searchParams.get("feedback");
    const dictionary: Record<string, string> = {
      created: "Cliente cadastrado com sucesso.",
      updated: "Cliente atualizado com sucesso.",
      deleted: "Cliente excluido com sucesso.",
      deactivated: "Cliente inativado com sucesso.",
      activated: "Cliente reativado com sucesso.",
    };

    return code ? dictionary[code] ?? null : null;
  }, [searchParams]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        title="Clientes"
        description="Consulte a base comercial, revise contatos e siga para o proximo atendimento."
        primaryAction={{ href: "/admin/clientes/novo", label: "Novo cliente" }}
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
        <Alert variant="danger" title="Nao foi possivel carregar os clientes.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Base cadastrada"
      >
        <FilterBar
          resultsCount={filteredCustomers.length}
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
            placeholder="Buscar cliente, documento ou contato"
            label="Buscar cliente, documento ou contato"
          />
          <label className="admin-field">
            <span className="admin-field__label">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  readStatusFilter(event.target.value),
                )
              }
              className="admin-select"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Ajuste os filtros ou cadastre o primeiro cliente para iniciar a base comercial."
            action={{ href: "/admin/clientes/novo", label: "Cadastrar cliente" }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredCustomers.map((customer) => (
              <article key={customer.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{customer.name}</strong>
                    <span className="admin-list-card__subtitle">
                      {customer.document || "Sem CPF/CNPJ informado"}
                    </span>
                  </div>
                  <StatusBadge
                    status={customer.isActive ? "Ativo" : "Inativo"}
                    tone={customer.isActive ? "success" : "neutral"}
                  />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox
                    label="Contato"
                    value={
                      customer.email ||
                      customer.phone ||
                      customer.whatsapp ||
                      "Sem contato informado"
                    }
                  />
                  <InfoBox
                    label="Localizacao"
                    value={
                      customer.city || customer.state
                        ? [customer.city, customer.state]
                            .filter(Boolean)
                            .join(" - ")
                        : "Nao informada"
                    }
                  />
                  <InfoBox
                    label="Cadastro"
                    value={formatDate(customer.createdAt)}
                  />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Revise os dados, inative quando necessario ou siga para o proximo passo comercial.
                  </span>
                  <div className="admin-row">
                    <Link
                      href="/admin/orcamentos/novo"
                      className="admin-button admin-button--secondary"
                    >
                      Novo orcamento
                    </Link>
                    <Link
                      href={`/admin/clientes/${customer.id}`}
                      className="admin-button admin-button--secondary"
                    >
                      Abrir cadastro
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

function InfoBox({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-surface-muted">
      <span className="admin-list-card__subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
