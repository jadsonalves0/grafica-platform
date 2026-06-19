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

type UserListItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  isPlatformAdmin: boolean;
  roles: Array<{
    id: string;
    name: string;
    code: string;
  }>;
};

type UsersResponse = {
  success: boolean;
  message?: string;
  data?: UserListItem[];
};

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/users", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as UsersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os usuarios.");
          setUsers([]);
          return;
        }

        setUsers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os usuarios.");
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.phone ?? "", user.roles.map((role) => role.name).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [search, users]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === "ACTIVE").length;
    const invited = users.filter((user) => user.status === "INVITED").length;
    const admins = users.filter((user) => user.isPlatformAdmin).length;

    return [
      { label: "Usuarios", value: String(users.length), description: "Pessoas com acesso a plataforma." },
      { label: "Ativos", value: String(active), description: "Acessos liberados no momento." },
      { label: "Convidados", value: String(invited), description: "Usuarios aguardando ativacao." },
      { label: "Admins", value: String(admins), description: "Perfis com escopo ampliado." },
    ];
  }, [users]);

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Administracao" }, { label: "Usuarios" }]}
        title="Usuarios"
        description="Gerencie quem entra no sistema, quais perfis cada pessoa carrega e qual o estado atual do acesso."
        primaryAction={{ href: "/admin/usuarios/novo", label: "Novo usuario" }}
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
        <Alert variant="danger" title="Nao foi possivel carregar os usuarios.">
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="Base de acessos"
        description="Busque por nome, e-mail, telefone ou perfil."
      >
        <FilterBar
          resultsCount={filteredUsers.length}
          onClear={search ? () => setSearch("") : undefined}
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar usuario"
            label="Buscar usuario"
          />
        </FilterBar>

        {isLoading ? (
          <Skeleton lines={7} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="Nenhum usuario encontrado"
            description="Cadastre a primeira pessoa ou refine a busca."
            action={{ href: "/admin/usuarios/novo", label: "Cadastrar usuario" }}
          />
        ) : (
          <div className="admin-list-stack">
            {filteredUsers.map((user) => (
              <article key={user.id} className="admin-list-card">
                <div className="admin-list-card__header">
                  <div className="admin-list-card__heading">
                    <strong className="admin-list-card__title">{user.name}</strong>
                    <span className="admin-list-card__subtitle">{user.email}</span>
                  </div>
                  <StatusBadge status={formatStatus(user.status)} tone={statusTone(user.status)} />
                </div>

                <div className="admin-list-card__meta">
                  <InfoBox
                    label="Perfis"
                    value={user.roles.map((role) => role.name).join(", ") || "Sem perfis"}
                  />
                  <InfoBox label="Telefone" value={user.phone || "Nao informado"} />
                  <InfoBox
                    label="Escopo"
                    value={user.isPlatformAdmin ? "Administrador da plataforma" : "Usuario da empresa"}
                  />
                </div>

                <div className="admin-list-card__footer">
                  <span className="admin-list-card__hint">
                    Revise perfis e status para manter acessos coerentes com a operacao.
                  </span>
                  <Link href={`/admin/usuarios/${user.id}`} className="admin-button admin-button--secondary">
                    Editar usuario
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

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INVITED: "Convidado",
    BLOCKED: "Bloqueado",
  };

  return labels[status] ?? status;
}

function statusTone(status: string) {
  const tones: Record<string, "success" | "warning" | "danger"> = {
    ACTIVE: "success",
    INVITED: "warning",
    BLOCKED: "danger",
  };

  return tones[status] ?? "warning";
}
