"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    title: "Visao geral",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    title: "Cadastros e acesso",
    items: [
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/permissoes", label: "Permissoes" },
      { href: "/admin/clientes", label: "Clientes" },
    ],
  },
  {
    title: "Operacao comercial",
    items: [
      { href: "/admin/orcamentos", label: "Orcamentos" },
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/estoque", label: "Estoque" },
      { href: "/admin/estoque/novo", label: "Cadastrar item" },
      { href: "/admin/estoque/movimentar", label: "Movimentacoes" },
      { href: "/admin/producao", label: "Producao" },
      { href: "/admin/financeiro", label: "Financeiro" },
      { href: "/admin/financeiro/categorias", label: "Categorias financeiras" },
      { href: "/admin/relatorios", label: "Relatorios" },
    ],
  },
  {
    title: "Site e captacao",
    items: [
      { href: "/admin/site", label: "Site institucional" },
      { href: "/admin/site/leads", label: "Leads do site" },
    ],
  },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "290px 1fr",
        background:
          "linear-gradient(180deg, rgba(255,248,241,0.95) 0%, rgba(245,240,232,0.92) 100%)",
      }}
    >
      <aside
        style={{
          position: "sticky",
          top: 0,
          alignSelf: "start",
          minHeight: "100vh",
          padding: 24,
          borderRight: "1px solid var(--border)",
          background:
            "linear-gradient(180deg, rgba(255,250,244,0.98) 0%, rgba(244,233,220,0.95) 100%)",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            padding: 20,
            borderRadius: 24,
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(232, 217, 202, 0.9)",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--primary)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Area interna
          </p>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, margin: 0 }}>
              Grafica Platform
            </h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
              Operacao, comercial, financeiro e site em uma unica base.
            </p>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 18 }}>
          {navSections.map((section) => (
            <div key={section.title} style={{ display: "grid", gap: 10 }}>
              <p
                style={{
                  margin: 0,
                  color: "var(--muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {section.title}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: isActive ? "var(--primary)" : "rgba(255,255,255,0.72)",
                        color: isActive ? "#fff" : "inherit",
                        fontWeight: isActive ? 700 : 600,
                        border: isActive ? "1px solid var(--primary)" : "1px solid var(--border)",
                        boxShadow: isActive ? "0 10px 24px rgba(181, 66, 31, 0.18)" : "none",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
