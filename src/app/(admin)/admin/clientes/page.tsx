"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

export default function ClientesPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const separator = query ? "&" : "?";
        const response = await fetch(`/api/customers${query}${separator}includeInactive=true`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as CustomersResponse;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar os clientes.");
          setCustomers([]);
          return;
        }

        setCustomers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao consultar os clientes.");
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

  const stats = useMemo(() => {
    const withEmail = customers.filter((customer) => customer.email).length;
    const withWhatsapp = customers.filter((customer) => customer.whatsapp).length;
    const withCity = customers.filter((customer) => customer.city).length;
    const inactive = customers.filter((customer) => !customer.isActive).length;

    return [
      {
        label: "Base total",
        value: String(customers.length),
        description: "Clientes prontos para orcamentos e pedidos.",
      },
      {
        label: "Com e-mail",
        value: String(withEmail),
        description: "Contatos aptos para proposta e acompanhamento.",
      },
      {
        label: "Com WhatsApp",
        value: String(withWhatsapp),
        description: "Relacionamento rapido para a operacao comercial.",
      },
      {
        label: "Com cidade",
        value: String(withCity),
        description: "Cadastros com localizacao preenchida.",
      },
      {
        label: "Inativos",
        value: String(inactive),
        description: "Cadastros preservados no historico, fora de novas operacoes.",
      },
    ];
  }, [customers]);

  const feedbackMessage = useMemo(() => {
    const dictionary: Record<string, string> = {
      updated: "Cliente atualizado com sucesso.",
      deleted: "Cliente excluido com sucesso.",
      deactivated: "Cliente inativado com sucesso.",
      activated: "Cliente reativado com sucesso.",
    };

    if (!feedbackCode) {
      return null;
    }

    return dictionary[feedbackCode] ?? null;
  }, [feedbackCode]);

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          padding: 28,
          borderRadius: 28,
          background:
            "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <p
              style={{
                margin: 0,
                color: "var(--primary)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Relacionamento comercial
            </p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Clientes
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Aqui fica a base que alimenta orcamentos, pedidos e o historico financeiro
              da grafica. O foco desta tela agora e consultar rapido, evitar duplicidade
              e cadastrar com menos atrito.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/clientes/novo" style={primaryButtonStyle}>
              Novo cliente
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          {stats.map((stat) => (
            <article
              key={stat.label}
              style={{
                padding: 20,
                borderRadius: 22,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(232, 217, 202, 0.9)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {stat.label}
              </p>
              <h2 style={{ margin: "10px 0 6px", fontSize: 34 }}>{stat.value}</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{stat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Base cadastrada</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Busque por nome, e-mail, documento ou WhatsApp.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente..."
            style={{
              ...inputStyle,
              width: "100%",
              maxWidth: 340,
              background: "#fff",
            }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
        {feedbackMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{feedbackMessage}</p> : null}

        {isLoading ? (
          <div style={{ ...emptyStateStyle, minHeight: 220 }}>
            <strong>Carregando clientes...</strong>
            <span style={{ color: "var(--muted)" }}>Estamos consultando a base da empresa.</span>
          </div>
        ) : customers.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum cliente encontrado.</strong>
            <span style={{ color: "var(--muted)" }}>
              Cadastre o primeiro cliente ou ajuste o termo de busca.
            </span>
            <Link href="/admin/clientes/novo" style={secondaryButtonStyle}>
              Cadastrar cliente
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {customers.map((customer) => (
              <article
                key={customer.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.1fr) minmax(0, 1.2fr) auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 24 }}>{customer.name}</h3>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {customer.document || "Sem CPF/CNPJ informado"}
                  </p>
                </div>

                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", marginBottom: 6 }}>Contato</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {customer.email || customer.phone || customer.whatsapp || "Sem contato informado"}
                  </p>
                </div>

                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", marginBottom: 6 }}>Localizacao</strong>
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {customer.city || customer.state
                      ? [customer.city, customer.state].filter(Boolean).join(" - ")
                      : "Nao informada"}
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: customer.isActive
                      ? "rgba(43, 110, 82, 0.12)"
                      : "rgba(161, 111, 37, 0.16)",
                    color: customer.isActive ? "#245844" : "#7a4f17",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    justifySelf: "end",
                  }}
                >
                  {customer.isActive ? "Ativo" : "Inativo"}
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(232, 217, 202, 0.85)",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    Cadastro em {formatDate(customer.createdAt)}
                  </span>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/admin/clientes/${customer.id}`} style={secondaryButtonStyle}>
                      Editar cadastro
                    </Link>
                    <Link href="/admin/orcamentos/novo" style={ghostButtonStyle}>
                      Criar orcamento
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const inputStyle = {
  height: 50,
  padding: "0 16px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "#fff",
  boxSizing: "border-box" as const,
} as const;

const primaryButtonStyle = {
  height: 50,
  padding: "0 20px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const secondaryButtonStyle = {
  height: 42,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const ghostButtonStyle = {
  height: 42,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const feedbackStyle = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 14,
  lineHeight: 1.6,
} as const;

const errorStyle = {
  background: "rgba(181, 66, 31, 0.12)",
  color: "var(--primary)",
} as const;

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
} as const;

const emptyStateStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  textAlign: "center" as const,
  padding: 36,
  borderRadius: 22,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.6)",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
