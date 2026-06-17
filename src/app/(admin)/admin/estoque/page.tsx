"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProductListItem = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

type ProductsResponse = {
  success: boolean;
  message?: string;
  data?: ProductListItem[];
};

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
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
  }, [search]);

  const stats = useMemo(() => {
    const lowStock = products.filter((product) => product.currentStock <= product.minimumStock).length;
    const services = products.filter((product) => product.type === "SERVICE").length;
    const materials = products.filter((product) => product.type === "RAW_MATERIAL").length;
    const finishedProducts = products.filter((product) => product.type === "FINISHED_PRODUCT").length;

    return [
      { label: "Itens ativos", value: String(products.length), description: "Catalogo geral da operacao." },
      { label: "Estoque baixo", value: String(lowStock), description: "Itens que pedem reposicao." },
      { label: "Materias-primas", value: String(materials), description: "Base de consumo da producao." },
      { label: "Produtos finais", value: String(finishedProducts), description: "Itens prontos para composicao e producao." },
      { label: "Servicos", value: String(services), description: "Itens comerciais sem saldo fisico." },
    ];
  }, [products]);

  return (
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section style={heroPanelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 780 }}>
            <p style={eyebrowStyle}>Catalogo operacional</p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Itens e estoque
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Cadastre insumos, servicos e produtos finais usados pela grafica. Essa base alimenta
              orcamentos, pedidos, movimentacoes, producao e lancamentos avulsos.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin/estoque/novo" style={primaryButtonStyle}>
              Novo item
            </Link>
            <Link href="/admin/estoque/movimentar" style={secondaryButtonStyle}>
              Movimentar estoque
            </Link>
            <Link href="/admin/producao" style={secondaryButtonStyle}>
              Produzir itens
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
              <p style={cardEyebrowStyle}>{stat.label}</p>
              <h2 style={{ margin: "10px 0 6px", fontSize: 34 }}>{stat.value}</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{stat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
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
            <h2 style={{ margin: 0 }}>Catalogo</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Busque por nome do item, SKU ou EAN/GTIN.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, SKU ou EAN/GTIN..."
            style={{ ...inputStyle, width: "100%", maxWidth: 340, background: "#fff" }}
          />
        </div>

        {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

        {isLoading ? (
          <div style={{ ...emptyStateStyle, minHeight: 220 }}>
            <strong>Carregando itens...</strong>
            <span style={{ color: "var(--muted)" }}>Estamos consultando o catalogo da empresa.</span>
          </div>
        ) : products.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum item encontrado.</strong>
            <span style={{ color: "var(--muted)" }}>
              Cadastre o primeiro item para comecar a montar o catalogo.
            </span>
            <Link href="/admin/estoque/novo" style={secondaryButtonStyle}>
              Cadastrar item
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {products.map((product) => (
              <article
                key={product.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 0.7fr 0.7fr 0.8fr 0.8fr auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{product.name}</strong>
                  <span style={{ color: "var(--muted)" }}>
                    {product.sku || "Sem SKU"} | {product.barcode ? `EAN ${product.barcode}` : "Sem EAN"} | {formatType(product.type)}
                  </span>
                </div>
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Unidade</strong>
                  <span>{product.unit}</span>
                </div>
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Atual</strong>
                  <span>{formatNumber(product.currentStock)}</span>
                </div>
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Minimo</strong>
                  <span>{formatNumber(product.minimumStock)}</span>
                </div>
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>Venda</strong>
                  <span>{formatCurrency(product.salePrice)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={stockBadgeStyle(product.currentStock <= product.minimumStock)}>
                    {product.currentStock <= product.minimumStock ? "Reposicao" : "Ok"}
                  </div>
                  <Link href={`/admin/estoque/${product.id}`} style={rowActionStyle}>
                    Editar item
                  </Link>
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(232, 217, 202, 0.85)",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                    Use a movimentacao para entradas e ajustes. Produtos finais tambem podem receber composicao e apontamento de producao.
                  </span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/admin/estoque/movimentar?productId=${product.id}`} style={miniActionStyle}>
                      Movimentar
                    </Link>
                    {product.type === "FINISHED_PRODUCT" ? (
                      <>
                        <Link href={`/admin/estoque/${product.id}/composicao`} style={miniActionStyle}>
                          Composicao
                        </Link>
                        <Link href={`/admin/producao?productId=${product.id}`} style={miniActionStyle}>
                          Produzir
                        </Link>
                      </>
                    ) : null}
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    RAW_MATERIAL: "Materia-prima",
    SERVICE: "Servico",
    FINISHED_PRODUCT: "Produto final",
  };
  return labels[type] ?? type;
}

function stockBadgeStyle(isLow: boolean) {
  return {
    padding: "10px 12px",
    borderRadius: 999,
    background: isLow ? "rgba(167, 45, 45, 0.12)" : "rgba(43, 110, 82, 0.12)",
    color: isLow ? "#8b2323" : "#245844",
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
    justifySelf: "end",
  };
}

const heroPanelStyle = {
  display: "grid",
  gap: 18,
  padding: 28,
  borderRadius: 28,
  background: "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
  border: "1px solid var(--border)",
  boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
} as const;

const panelStyle = {
  display: "grid",
  gap: 16,
  padding: 24,
  borderRadius: 24,
  border: "1px solid var(--border)",
  background: "var(--surface)",
} as const;

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
  height: 48,
  padding: "0 18px",
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

const rowActionStyle = {
  height: 40,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap" as const,
} as const;

const miniActionStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap" as const,
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
  display: "grid",
  gap: 10,
  placeItems: "center",
  textAlign: "center" as const,
  padding: 36,
  borderRadius: 22,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.6)",
} as const;

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
} as const;

const cardEyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  fontWeight: 700,
} as const;
