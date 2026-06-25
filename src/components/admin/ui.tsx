"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useRef } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type TopNavItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

type PageAction = {
  href?: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  target?: string;
};

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const statusMap: Record<string, StatusTone> = {
  ACTIVE: "success",
  PAID: "success",
  COMPLETED: "success",
  CONFIRMED: "success",
  PUBLISHED: "success",
  APPROVED: "success",
  SUCCESS: "success",
  PENDING: "warning",
  DRAFT: "neutral",
  INACTIVE: "neutral",
  CANCELED: "danger",
  CANCELLED: "danger",
  OVERDUE: "danger",
  ERROR: "danger",
  LOW_STOCK: "warning",
  IN_PROGRESS: "info",
  EM_ANDAMENTO: "info",
};

export function AppBreadcrumb({ items }: Readonly<{ items: BreadcrumbItem[] }>) {
  return (
    <nav aria-label="Breadcrumb" className="admin-breadcrumb">
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className="admin-breadcrumb__link">
              {item.label}
            </Link>
          ) : (
            <span className="admin-breadcrumb__current">{item.label}</span>
          )}
          {index < items.length - 1 ? (
            <span className="admin-breadcrumb__separator" aria-hidden="true">
              /
            </span>
          ) : null}
        </Fragment>
      ))}
    </nav>
  );
}

export function Topbar({
  brand,
  companyName,
  userName,
  breadcrumbs,
  primaryNav = [],
  utilityNav = [],
  contextNav = [],
  onOpenMenu,
  onSignOut,
}: Readonly<{
  brand?: {
    label: string;
    secondaryLabel?: string;
    href: string;
  };
  companyName: string;
  userName: string;
  breadcrumbs: BreadcrumbItem[];
  primaryNav?: TopNavItem[];
  utilityNav?: TopNavItem[];
  contextNav?: TopNavItem[];
  onOpenMenu?: () => void;
  onSignOut?: () => void;
}>) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__row admin-topbar__row--main">
        <div className="admin-topbar__main">
          <div className="admin-topbar__brand-group">
            {onOpenMenu ? (
              <button
                type="button"
                className="admin-icon-button admin-topbar__menu-button"
                onClick={onOpenMenu}
                aria-label="Abrir navegacao"
              >
                <MenuIcon />
              </button>
            ) : null}

            {brand ? (
              <Link href={brand.href} className="admin-app-brand" aria-label={brand.label}>
                <span className="admin-app-brand__mark">GP</span>
                <span className="admin-app-brand__text">
                  <strong>{brand.label}</strong>
                  {brand.secondaryLabel ? <small>{brand.secondaryLabel}</small> : null}
                </span>
              </Link>
            ) : null}
          </div>

          {primaryNav.length ? (
            <nav className="admin-top-nav" aria-label="Modulos principais">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-top-nav__link ${item.isActive ? "is-active" : ""}`}
                  aria-current={item.isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="admin-topbar__meta">
          {utilityNav.length ? (
            <nav className="admin-topbar__utility" aria-label="Acessos auxiliares">
              {utilityNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-top-nav__link admin-top-nav__link--subtle ${item.isActive ? "is-active" : ""}`}
                  aria-current={item.isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <details className="admin-profile-menu">
            <summary className="admin-profile-menu__summary" aria-haspopup="menu">
              <span className="admin-profile-menu__identity">
                <strong>{userName}</strong>
                <small>{companyName}</small>
              </span>
              <span className="admin-profile-menu__chevron" aria-hidden="true">
                v
              </span>
            </summary>
            <div className="admin-profile-menu__panel" role="menu" aria-label="Perfil do usuario">
              <div className="admin-profile-menu__details">
                <strong>{userName}</strong>
                <span>{companyName}</span>
              </div>
              {onSignOut ? (
                <button type="button" className="admin-link-button" onClick={onSignOut} role="menuitem">
                  Sair
                </button>
              ) : null}
            </div>
          </details>
        </div>
      </div>

      <div className="admin-topbar__row admin-topbar__row--context">
        <div className="admin-topbar__titles">
          <AppBreadcrumb items={breadcrumbs} />
        </div>
        {contextNav.length ? (
          <nav className="admin-module-tabs" aria-label="Navegacao do modulo">
            {contextNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-module-tabs__link ${item.isActive ? "is-active" : ""}`}
                aria-current={item.isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions = [],
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: PageAction;
  secondaryActions?: PageAction[];
}>) {
  return (
    <section className="admin-page-header">
      <div className="admin-page-header__content">
        {breadcrumbs?.length ? <AppBreadcrumb items={breadcrumbs} /> : null}
        {eyebrow ? <p className="admin-page-header__eyebrow">{eyebrow}</p> : null}
        <div className="admin-page-header__stack">
          <h1 className="admin-page-header__title">{title}</h1>
          {description ? <p className="admin-page-header__description">{description}</p> : null}
        </div>
      </div>

      {(primaryAction || secondaryActions.length > 0) ? (
        <div className="admin-page-header__actions">
          {secondaryActions.map((action) => (
            <HeaderAction key={action.label} action={action} />
          ))}
          {primaryAction ? <HeaderAction action={{ ...primaryAction, variant: primaryAction.variant ?? "primary" }} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function HeaderAction({ action }: Readonly<{ action: PageAction }>) {
  const className = `admin-button admin-button--${action.variant ?? "secondary"}`;

  if (action.href) {
    return (
      <Link href={action.href} className={className} target={action.target}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: Readonly<{
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section className="admin-section-card">
      {(title || description || actions) ? (
        <header className="admin-section-card__header">
          <div className="admin-section-card__heading">
            {title ? <h2 className="admin-section-card__title">{title}</h2> : null}
            {description ? <p className="admin-section-card__description">{description}</p> : null}
          </div>
          {actions ? <div className="admin-section-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="admin-section-card__body">{children}</div>
    </section>
  );
}

export function FormSection({
  title,
  description,
  defaultOpen = true,
  children,
}: Readonly<{
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <details className="admin-form-section" open={defaultOpen}>
      <summary className="admin-form-section__summary">
        <div>
          <strong>{title}</strong>
          {description ? <p>{description}</p> : null}
        </div>
      </summary>
      <div className="admin-form-section__content">{children}</div>
    </details>
  );
}

export function Field({
  label,
  required,
  optional,
  helpText,
  error,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}>) {
  const helpId = useId();
  const errorId = useId();

  return (
    <label className="admin-field">
      <span className="admin-field__label">
        {label}
        {required ? <strong className="admin-field__required"> *</strong> : null}
        {optional ? <span className="admin-field__optional">Opcional</span> : null}
      </span>
      <div aria-describedby={`${helpText ? helpId : ""} ${error ? errorId : ""}`.trim()}>
        {children}
      </div>
      {helpText ? (
        <span id={helpId} className="admin-field__help">
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="admin-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar...",
  label = "Buscar",
  autoFocus = false,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}>) {
  return (
    <div className="admin-search-field">
      <span className="sr-only">{label}</span>
      <span className="admin-search-field__icon" aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-search-field__input"
        placeholder={placeholder}
        type="search"
        aria-label={label}
        autoFocus={autoFocus}
      />
      {value ? (
        <button
          type="button"
          className="admin-search-field__clear"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
        >
          Limpar
        </button>
      ) : null}
    </div>
  );
}

export function FilterBar({
  children,
  resultsCount,
  onClear,
  activeFilters = [],
}: Readonly<{
  children: React.ReactNode;
  resultsCount?: number;
  onClear?: () => void;
  activeFilters?: string[];
}>) {
  return (
    <div className="admin-filter-bar">
      <div className="admin-filter-bar__controls">{children}</div>
      <div className="admin-filter-bar__meta">
        {typeof resultsCount === "number" ? (
          <span className="admin-filter-bar__results">
            {resultsCount} resultado{resultsCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {onClear ? (
          <button type="button" className="admin-link-button" onClick={onClear}>
            Limpar filtros
          </button>
        ) : null}
      </div>
      {activeFilters.length ? (
        <div className="admin-filter-bar__active" aria-label="Filtros ativos">
          {activeFilters.map((filter) => (
            <span key={filter} className="admin-filter-chip">
              {filter}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DataTable({
  columns,
  children,
}: Readonly<{
  columns: string[];
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-table">
      <div className="admin-table__header">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="admin-table__body">{children}</div>
    </div>
  );
}

export function StatusBadge({
  status,
  tone,
}: Readonly<{
  status: string;
  tone?: StatusTone;
}>) {
  const normalizedTone = tone ?? statusMap[status.toUpperCase()] ?? "neutral";
  return (
    <span className={`admin-status-badge admin-status-badge--${normalizedTone}`}>
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description?: string;
  action?: PageAction;
}>) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-state__icon" aria-hidden="true">
        o
      </div>
      <div className="admin-empty-state__text">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <HeaderAction action={{ ...action, variant: action.variant ?? "secondary" }} /> : null}
    </div>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
}: Readonly<{
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className={`admin-alert admin-alert--${variant}`} role={variant === "danger" ? "alert" : "status"}>
      {title ? <strong className="admin-alert__title">{title}</strong> : null}
      <div className="admin-alert__body">{children}</div>
    </div>
  );
}

export function Toast(props: Readonly<{ variant?: "info" | "success" | "warning" | "danger"; message: string }>) {
  return (
    <div className="admin-toast">
      <Alert variant={props.variant}>{props.message}</Alert>
    </div>
  );
}

export function Drawer({
  isOpen,
  title,
  onClose,
  children,
}: Readonly<{
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const frame = window.requestAnimationFrame(() => {
      const focusTarget =
        panelRef.current?.querySelector<HTMLElement>(
          "[data-drawer-close], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ) ?? panelRef.current;

      focusTarget?.focus();
    });

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      lastFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-drawer" role="dialog" aria-modal="true">
      <button type="button" className="admin-drawer__backdrop" onClick={onClose} aria-label="Fechar painel" />
      <div className="admin-drawer__panel" ref={panelRef} tabIndex={-1}>
        <div className="admin-drawer__header">
          {title ? <strong>{title}</strong> : <span />}
          <button
            type="button"
            className="admin-icon-button"
            onClick={onClose}
            aria-label="Fechar"
            data-drawer-close
          >
            X
          </button>
        </div>
        <div className="admin-drawer__body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  onConfirm,
  onCancel,
  danger = false,
}: Readonly<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}>) {
  return (
    <Drawer isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="admin-confirm-dialog">
        <p>{description}</p>
        <div className="admin-confirm-dialog__actions">
          <button type="button" className="admin-button admin-button--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-button admin-button--${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
}: Readonly<{
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="admin-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`admin-tabs__tab ${activeTab === tab.id ? "is-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StickyActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-sticky-action-bar">{children}</div>;
}

export function MetricCard({
  label,
  value,
  description,
  href,
}: Readonly<{
  label: string;
  value: string;
  description?: string;
  href?: string;
}>) {
  const content = (
    <>
      <span className="admin-metric-card__label">{label}</span>
      <strong className="admin-metric-card__value">{value}</strong>
      {description ? <p className="admin-metric-card__description">{description}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="admin-metric-card admin-metric-card--interactive">
        {content}
      </Link>
    );
  }

  return <div className="admin-metric-card">{content}</div>;
}

export function Skeleton({
  lines = 3,
}: Readonly<{
  lines?: number;
}>) {
  return (
    <div className="admin-skeleton" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="admin-skeleton__line" />
      ))}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingButton({
  isLoading,
  loadingLabel,
  children,
  className = "admin-button admin-button--primary",
  ...props
}: Readonly<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean;
    loadingLabel?: string;
  }
>) {
  return (
    <button
      {...props}
      className={className}
      disabled={props.disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? loadingLabel ?? "Salvando..." : children}
    </button>
  );
}
