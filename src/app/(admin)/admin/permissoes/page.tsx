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

type RoleListItem = {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  permissionCodes: string[];
};

type RolesResponse = {
  success: boolean;
  message?: string;
  data?: RoleListItem[];
};

export default function PermissoesPage() {
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoles() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/roles", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as RolesResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os perfis.");
          setRoles([]);
          return;
        }

        setRoles(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os perfis.");
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadRoles();

    return () => controller.abort();
  }, []);

  const filteredRoles = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return roles;
    }

    return roles.filter((role) =>
      [role.name, role.code, role.permissionCodes.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [search, roles]);

  const stats = useMemo(() => {
    const system = roles.filter((role) => role.isSystem).length;
    const custom = roles.filter((role) => !role.isSystem).length;
    const totalPermissions = roles.reduce((sum, role) => sum + role.permissionCodes.length, 0);

    return [
      { label: "Perfis", value: String(roles.length), description: "Modelos de acesso cadastrados." },
      { label: "Sistema", value: String(system), description: "Perfis nativos da plataforma." },
      { label: "Customizados", value: String(custom), description: "Perfis criados para a operacao." },
      { label: "Escopos", value: String(totalPermissions), description: "Permissoes somadas entre os perfis." },
    ];
  }, [roles]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Administracao" }, { label: "Perfis e permissoes" }]}
        title="Perfis e permissoes"
        description="Visualize quem pode fazer o que dentro da plataforma e mantenha perfis aderentes a cada grafica."
        primaryAction={{ href: "/admin/permissoes/novo", label: "Novo perfil" }}
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
        <Alert variant="danger" title="Nao foi possivel carregar os perfis.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Perfis cadastrados"
        description="Busque por nome do perfil, codigo ou permissao."
      >
        <FilterBar
          resultsCount={filteredRoles.length}
          onClear={search ? () => setSearch("") : undefined}
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar perfil"
            label="Buscar perfil"
          />
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : filteredRoles.length === 0 ? (
          <EmptyState
            title="Nenhum perfil encontrado"
            description="Crie um novo perfil ou refine a busca."
            action={{ href: "/admin/permissoes/novo", label: "Cadastrar perfil" }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredRoles.map((role) => (
              <article key={role.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{role.name}</strong>
                    <span className="admin-list-card__subtitle">{role.code}</span>
                  </div>
                  <StatusBadge
                    status={role.isSystem ? "Sistema" : "Customizado"}
                    tone={role.isSystem ? "warning" : "success"}
                  />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox label="Permissoes" value={`${role.permissionCodes.length} liberacao(oes)`} />
                  <InfoBox
                    label="Escopos principais"
                    value={role.permissionCodes.slice(0, 4).join(", ") || "Sem permissoes"}
                  />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Revise o perfil antes de atribuir o acesso para manter o menu e a autorizacao coerentes.
                  </span>
                  <Link href={`/admin/permissoes/${role.id}`} className="admin-button admin-button--secondary">
                    Editar perfil
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
