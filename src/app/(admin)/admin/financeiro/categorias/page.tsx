"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

    loadCategories();

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

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          padding: 28,
          borderRadius: 28,
          background: "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 760 }}>
            <p style={eyebrowStyle}>Padronizacao financeira</p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Categorias financeiras
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Centralize as categorias de receita e despesa para manter os lancamentos coerentes e os relatorios limpos.
            </p>
          </div>

          <Link href="/admin/financeiro/categorias/nova" style={primaryButtonStyle}>
            Nova categoria
          </Link>
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Cadastro de categorias</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Use a mesma base para lancamentos avulsos, recebimentos e despesas operacionais.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar categoria..."
            style={{ ...inputStyle, width: "100%", maxWidth: 320 }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

        {isLoading ? (
          <div style={emptyStateStyle}>Carregando categorias...</div>
        ) : filteredCategories.length === 0 ? (
          <div style={emptyStateStyle}>Nenhuma categoria encontrada.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredCategories.map((category) => (
              <article
                key={category.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 0.7fr) minmax(0, 0.7fr) auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 18,
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.82)",
                }}
              >
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{category.name}</strong>
                  <span style={{ color: "var(--muted)" }}>
                    Atualizada em {formatDate(category.updatedAt)}
                  </span>
                </div>

                <span style={typeBadgeStyle(category.type)}>
                  {category.type === "INCOME" ? "Receita" : "Despesa"}
                </span>

                <span style={statusBadgeStyle(category.isActive)}>
                  {category.isActive ? "Ativa" : "Inativa"}
                </span>

                <Link href={`/admin/financeiro/categorias/${category.id}`} style={miniButtonStyle}>
                  Editar
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function typeBadgeStyle(type: "INCOME" | "EXPENSE") {
  return {
    padding: "10px 12px",
    borderRadius: 999,
    background: type === "INCOME" ? "rgba(43, 110, 82, 0.12)" : "rgba(181, 66, 31, 0.12)",
    color: type === "INCOME" ? "#245844" : "var(--primary)",
    fontWeight: 700,
    textAlign: "center" as const,
  };
}

function statusBadgeStyle(isActive: boolean) {
  return {
    padding: "10px 12px",
    borderRadius: 999,
    background: isActive ? "rgba(43, 110, 82, 0.12)" : "rgba(117, 117, 117, 0.18)",
    color: isActive ? "#245844" : "#4d4d4d",
    fontWeight: 700,
    textAlign: "center" as const,
  };
}

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
} as const;

const inputStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  boxSizing: "border-box" as const,
} as const;

const primaryButtonStyle = {
  height: 48,
  padding: "0 18px",
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

const miniButtonStyle = {
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

const emptyStateStyle = {
  padding: 24,
  borderRadius: 18,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.6)",
  color: "var(--muted)",
  textAlign: "center" as const,
} as const;
