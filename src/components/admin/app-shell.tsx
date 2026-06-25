"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PERMISSIONS } from "@/lib/permissions/permission-types";
import { Drawer, Topbar, type BreadcrumbItem } from "@/components/admin/ui";

type Viewer = {
  companyTradeName: string;
  userName: string;
  permissions: string[];
  isPlatformAdmin: boolean;
};

type NavItem = {
  label: string;
  href: string;
  matchStartsWith?: string[];
  isActive?: (pathname: string) => boolean;
  visible?: (viewer: Viewer) => boolean;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
  compactHref?: string;
  placement?: "main" | "footer";
  visible?: (viewer: Viewer) => boolean;
};

function hasAnyPermission(viewer: Viewer, permissions: string[]) {
  if (viewer.isPlatformAdmin) {
    return true;
  }

  return permissions.some((permission) => viewer.permissions.includes(permission));
}

function isItemCatalogPath(pathname: string) {
  if (pathname === "/admin/estoque" || pathname === "/admin/estoque/novo") {
    return true;
  }

  const match = pathname.match(/^\/admin\/estoque\/([^/]+)(?:\/composicao)?$/);

  if (!match) {
    return false;
  }

  return !["grupos", "entradas", "movimentar", "posicao"].includes(match[1]);
}

const navSections: NavSection[] = [
  {
    id: "home",
    label: "Inicio",
    compactHref: "/dashboard",
    placement: "main",
    items: [{ label: "Inicio", href: "/dashboard" }],
  },
  {
    id: "commercial",
    label: "Comercial",
    compactHref: "/admin/pedidos",
    placement: "main",
    visible: (viewer) =>
      hasAnyPermission(viewer, [
        PERMISSIONS.customersView,
        PERMISSIONS.quotesView,
        PERMISSIONS.ordersView,
        PERMISSIONS.financialView,
        PERMISSIONS.siteView,
      ]),
    items: [
      {
        label: "Clientes",
        href: "/admin/clientes",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.customersView]),
      },
      {
        label: "Orcamentos",
        href: "/admin/orcamentos",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.quotesView]),
      },
      {
        label: "Pedidos",
        href: "/admin/pedidos",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.ordersView]),
      },
      {
        label: "Vendas",
        href: "/admin/vendas",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialView, PERMISSIONS.financialManage]),
      },
    ],
  },
  {
    id: "operations",
    label: "Operacao",
    compactHref: "/admin/producao",
    placement: "main",
    visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryView, PERMISSIONS.inventoryUpdate]),
    items: [
      {
        label: "Producao",
        href: "/admin/producao",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryView]),
      },
      {
        label: "Estoque",
        href: "/admin/estoque/posicao",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryView]),
      },
      {
        label: "Entradas",
        href: "/admin/estoque/entradas",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryView]),
      },
      {
        label: "Ajustes de estoque",
        href: "/admin/estoque/movimentar",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryUpdate]),
      },
    ],
  },
  {
    id: "financial",
    label: "Financeiro",
    compactHref: "/admin/financeiro",
    placement: "main",
    visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialView, PERMISSIONS.financialManage]),
    items: [
      {
        label: "Visao financeira",
        href: "/admin/financeiro",
        isActive: (pathname) => pathname === "/admin/financeiro",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialView]),
      },
      {
        label: "Contas a receber",
        href: "/admin/financeiro?view=receivable&status=PENDING",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialView]),
      },
      {
        label: "Contas a pagar",
        href: "/admin/financeiro?view=payable&status=PENDING",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialView]),
      },
      {
        label: "Caixa e bancos",
        href: "/admin/financeiro?view=cash",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialView]),
      },
      {
        label: "Lancamentos manuais",
        href: "/admin/financeiro?view=manual",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialManage]),
      },
    ],
  },
  {
    id: "website",
    label: "Meu site",
    compactHref: "/admin/site",
    placement: "main",
    visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.siteView, PERMISSIONS.siteUpdate]),
    items: [
      {
        label: "Visao geral",
        href: "/admin/site",
        isActive: (pathname) => pathname === "/admin/site",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.siteView, PERMISSIONS.siteUpdate]),
      },
      {
        label: "Leads do site",
        href: "/admin/site/leads",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.siteView, PERMISSIONS.siteUpdate]),
      },
      {
        label: "Visualizar site",
        href: "/ponto-print",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.siteView, PERMISSIONS.siteUpdate]),
      },
    ],
  },
  {
    id: "reports",
    label: "Relatorios",
    compactHref: "/admin/relatorios",
    placement: "main",
    visible: (viewer) =>
      hasAnyPermission(viewer, [PERMISSIONS.financialView, PERMISSIONS.inventoryView, PERMISSIONS.ordersView]),
    items: [{ label: "Central de relatorios", href: "/admin/relatorios" }],
  },
  {
    id: "registries",
    label: "Cadastros",
    compactHref: "/admin/estoque",
    placement: "footer",
    visible: (viewer) =>
      hasAnyPermission(viewer, [
        PERMISSIONS.inventoryView,
        PERMISSIONS.financialManage,
      ]),
    items: [
      {
        label: "Produtos e servicos",
        href: "/admin/estoque",
        isActive: isItemCatalogPath,
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryView]),
      },
      {
        label: "Grupos de itens",
        href: "/admin/estoque/grupos",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.inventoryView]),
      },
      {
        label: "Categorias financeiras",
        href: "/admin/financeiro/categorias",
        isActive: (pathname) => pathname.startsWith("/admin/financeiro/categorias"),
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialManage]),
      },
    ],
  },
  {
    id: "settings",
    label: "Configuracoes",
    compactHref: "/admin/empresa",
    placement: "footer",
    visible: (viewer) =>
      viewer.isPlatformAdmin ||
      hasAnyPermission(viewer, [
        PERMISSIONS.financialManage,
        PERMISSIONS.usersView,
        PERMISSIONS.companiesView,
        PERMISSIONS.companiesUpdate,
      ]),
    items: [
      {
        label: "Empresa",
        href: "/admin/empresa",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.companiesView, PERMISSIONS.companiesUpdate]),
      },
      {
        label: "Usuarios e acessos",
        href: "/admin/usuarios",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.usersView]),
      },
      {
        label: "Contas financeiras",
        href: "/admin/financeiro/contas/nova",
        isActive: (pathname) => pathname.startsWith("/admin/financeiro/contas"),
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.financialManage]),
      },
      {
        label: "Regras operacionais",
        href: "/admin/parametros",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.companiesUpdate]),
      },
      {
        label: "Historico de alteracoes",
        href: "/admin/auditoria",
        visible: (viewer) => hasAnyPermission(viewer, [PERMISSIONS.companiesView]),
      },
    ],
  },
];

export function AdminShell({
  viewer,
  children,
}: Readonly<{
  viewer: Viewer;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  useEffect(() => {
    const storedState = window.localStorage.getItem("grafica-platform:sidebar-collapsed");
    setIsCollapsed(storedState === "true");
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const visibleSections = useMemo(
    () =>
      navSections
        .filter((section) => (section.visible ? section.visible(viewer) : true))
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => (item.visible ? item.visible(viewer) : true)),
        }))
        .filter((section) => section.items.length > 0),
    [viewer],
  );
  const mainSections = useMemo(
    () => visibleSections.filter((section) => section.placement !== "footer"),
    [visibleSections],
  );
  const footerSections = useMemo(
    () => visibleSections.filter((section) => section.placement === "footer"),
    [visibleSections],
  );
  const activeSectionId = useMemo(
    () =>
      visibleSections.find((section) => section.items.some((item) => matchesItem(pathname, item)))?.id ??
      mainSections[0]?.id ??
      null,
    [mainSections, pathname, visibleSections],
  );

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname, visibleSections), [pathname, visibleSections]);

  useEffect(() => {
    if (!isCollapsed && activeSectionId) {
      setExpandedSectionId(activeSectionId);
    }
  }, [activeSectionId, isCollapsed]);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  function toggleSidebar() {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("grafica-platform:sidebar-collapsed", String(next));
      return next;
    });
  }

  function renderSidebarContent({
    collapsed,
    allowCollapseToggle,
  }: Readonly<{ collapsed: boolean; allowCollapseToggle: boolean }>) {
    return (
      <div className="admin-sidebar__content">
        <Link href="/dashboard" className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark">GP</span>
          {!collapsed ? (
            <span className="admin-sidebar__brand-text">
              <strong>Grafica Platform</strong>
              <small>{viewer.companyTradeName}</small>
            </span>
          ) : null}
        </Link>

        {collapsed ? (
          <nav className="admin-sidebar__compact-nav" aria-label="Navegacao principal">
            {[...mainSections, ...footerSections].map((section) => {
              const shortcut = resolveCompactItem(section, pathname);
              const isSectionActive = section.items.some((item) => matchesItem(pathname, item));

              return (
                <Link
                  key={section.id}
                  href={shortcut.href}
                  className={`admin-sidebar__compact-item ${isSectionActive ? "is-active" : ""}`}
                  aria-label={section.label}
                  aria-current={isSectionActive ? "location" : undefined}
                  title={section.label}
                >
                  <span className="admin-sidebar__compact-mark" aria-hidden="true">
                    {buildCompactLabel(section.label)}
                  </span>
                  <span className="admin-sidebar__tooltip" role="tooltip">
                    {section.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="admin-sidebar__nav">
            <nav className="admin-sidebar__main-nav" aria-label="Navegacao principal">
              {mainSections.map((section) => {
                if (section.id === "home") {
                  const item = section.items[0];
                  const isActive = matchesItem(pathname, item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-sidebar__item ${isActive ? "is-active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                }

                const isSectionActive = section.items.some((item) => matchesItem(pathname, item));
                const isExpanded = expandedSectionId === section.id;

                return (
                  <div key={section.id} className="admin-sidebar__group">
                    <button
                      type="button"
                      className={`admin-sidebar__group-summary ${isSectionActive ? "is-active" : ""}`}
                      onClick={() =>
                        setExpandedSectionId((current) => (current === section.id ? null : section.id))
                      }
                      aria-expanded={isExpanded}
                    >
                      <span>{section.label}</span>
                      <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
                    </button>
                    {isExpanded ? (
                      <div className="admin-sidebar__items">
                        {section.items.map((item) => {
                          const isActive = matchesItem(pathname, item);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`admin-sidebar__item ${isActive ? "is-active" : ""}`}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>

            {footerSections.length ? (
              <div className="admin-sidebar__settings">
                {footerSections.map((section) => {
                  const isSectionActive = section.items.some((item) => matchesItem(pathname, item));
                  const isExpanded = expandedSectionId === section.id;

                  return (
                    <div key={section.id} className="admin-sidebar__group">
                      <button
                        type="button"
                        className={`admin-sidebar__group-summary ${isSectionActive ? "is-active" : ""}`}
                        onClick={() =>
                          setExpandedSectionId((current) => (current === section.id ? null : section.id))
                        }
                        aria-expanded={isExpanded}
                      >
                        <span>{section.label}</span>
                        <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
                      </button>
                      {isExpanded ? (
                        <div className="admin-sidebar__items">
                          {section.items.map((item) => {
                            const isActive = matchesItem(pathname, item);

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`admin-sidebar__item ${isActive ? "is-active" : ""}`}
                                aria-current={isActive ? "page" : undefined}
                              >
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {allowCollapseToggle ? (
          <div className="admin-sidebar__footer">
            <button
              type="button"
              className="admin-sidebar__toggle"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {collapsed ? <ChevronDoubleRightIcon /> : <ChevronDoubleLeftIcon />}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`admin-theme admin-shell ${isCollapsed ? "is-collapsed" : ""}`}>
      <aside className="admin-sidebar">
        {renderSidebarContent({ collapsed: isCollapsed, allowCollapseToggle: true })}
      </aside>
      <div className="admin-shell__body">
        <Topbar
          companyName={viewer.companyTradeName}
          userName={viewer.userName}
          breadcrumbs={breadcrumbs}
          onOpenMenu={() => setIsMobileOpen(true)}
          onSignOut={handleSignOut}
        />
        <main className="admin-shell__main">{children}</main>
      </div>
      <Drawer isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} title="Navegacao">
        {renderSidebarContent({ collapsed: false, allowCollapseToggle: false })}
      </Drawer>
    </div>
  );
}

function resolveCompactItem(section: NavSection, pathname: string) {
  return (
    section.items.find((item) => matchesItem(pathname, item)) ||
    section.items.find((item) => item.href.split("?")[0] === section.compactHref) ||
    section.items[0]
  );
}

function matchesItem(pathname: string, item: NavItem) {
  const baseHref = item.href.split("?")[0];

  return (
    item.isActive?.(pathname) ||
    pathname === baseHref ||
    item.matchStartsWith?.some((prefix) => pathname.startsWith(prefix)) ||
    (baseHref !== "/dashboard" && pathname.startsWith(`${baseHref}/`))
  );
}

function buildBreadcrumbs(pathname: string, sections: NavSection[]) {
  if (pathname === "/dashboard") {
    return [{ label: "Inicio", href: "/dashboard" }] satisfies BreadcrumbItem[];
  }

  for (const section of sections) {
    for (const item of section.items) {
      if (matchesItem(pathname, item)) {
        const breadcrumbs: BreadcrumbItem[] = [{ label: "Inicio", href: "/dashboard" }];

        if (section.id !== "home") {
          breadcrumbs.push({ label: section.label });
        }

        breadcrumbs.push({ label: item.label, href: item.href });

        const baseHref = item.href.split("?")[0];
        if (pathname !== baseHref) {
          if (pathname.endsWith("/novo")) {
            breadcrumbs.push({ label: `Novo ${item.label.slice(0, -1).toLowerCase()}` });
          } else if (pathname.includes("/composicao")) {
            breadcrumbs.push({ label: "Composicao" });
          } else {
            breadcrumbs.push({ label: "Detalhes" });
          }
        }

        return breadcrumbs;
      }
    }
  }

  return [
    { label: "Inicio", href: "/dashboard" },
    { label: "Painel interno" },
  ] satisfies BreadcrumbItem[];
}

function buildCompactLabel(label: string) {
  const compactWords = label
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

  const sourceWords = compactWords.length ? compactWords : label.split(/\s+/);

  if (sourceWords.length === 1) {
    return sourceWords[0].slice(0, 2).toUpperCase();
  }

  return sourceWords
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function ChevronDoubleLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 5L11 10L16 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDoubleRightIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5L9 10L4 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
