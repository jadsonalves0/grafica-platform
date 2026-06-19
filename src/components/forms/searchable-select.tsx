"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  clearable?: boolean;
  maxResults?: number;
  autoFocus?: boolean;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Pesquisar...",
  disabled = false,
  emptyMessage = "Nenhum resultado encontrado.",
  clearable = false,
  maxResults = 8,
  autoFocus = false,
}: Readonly<SearchableSelectProps>) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }

    inputRef.current?.focus();
  }, [autoFocus, disabled]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedOption?.label ?? "");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    const source = normalizedQuery
      ? options.filter((option) =>
          normalizeSearchText(
            [option.label, option.description, ...(option.keywords ?? [])]
              .filter(Boolean)
              .join(" "),
          ).includes(normalizedQuery),
        )
      : options;

    return source.slice(0, maxResults);
  }, [maxResults, options, query]);

  useEffect(() => {
    if (!filteredOptions.length) {
      setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex((current) => Math.min(current, filteredOptions.length - 1));
  }, [filteredOptions]);

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    setIsOpen(true);
    setHighlightedIndex(0);

    if (value) {
      onChange("");
    }
  }

  function handleSelect(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
    setHighlightedIndex(0);
  }

  function handleClear() {
    onChange("");
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!filteredOptions.length && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) =>
        filteredOptions.length ? (current + 1) % filteredOptions.length : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) =>
        filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0,
      );
      return;
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) {
        handleSelect(option);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery(selectedOption?.label ?? "");
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "grid", gap: 8 }}>
      <div style={inputShellStyle(disabled)}>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `${listboxId}-${filteredOptions[highlightedIndex].value}`
              : undefined
          }
          style={inputStyle}
        />

        {clearable && value ? (
          <button type="button" onClick={handleClear} style={clearButtonStyle}>
            Limpar
          </button>
        ) : (
          <span style={iconStyle}>Buscar</span>
        )}
      </div>

      {isOpen && !disabled ? (
        <div id={listboxId} role="listbox" style={dropdownStyle}>
          {filteredOptions.length === 0 ? (
            <div style={emptyStateStyle}>{emptyMessage}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                id={`${listboxId}-${option.value}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                style={optionButtonStyle(
                  option.value === value,
                  filteredOptions[highlightedIndex]?.value === option.value,
                )}
              >
                <strong>{option.label}</strong>
                {option.description ? (
                  <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                    {option.description}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inputShellStyle(disabled: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 48,
    padding: "0 14px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: disabled ? "rgba(255,255,255,0.7)" : "#fff",
  } as const;
}

const inputStyle = {
  flex: 1,
  minWidth: 0,
  height: "100%",
  border: 0,
  outline: "none",
  background: "transparent",
  font: "inherit",
  color: "inherit",
} as const;

const iconStyle = {
  color: "var(--muted)",
  fontSize: 18,
  lineHeight: 1,
} as const;

const clearButtonStyle = {
  border: 0,
  background: "transparent",
  color: "var(--primary)",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
} as const;

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 20,
  display: "grid",
  gap: 6,
  padding: 8,
  borderRadius: 18,
  border: "1px solid rgba(232, 217, 202, 0.95)",
  background: "#fffdf9",
  boxShadow: "0 18px 36px rgba(77, 39, 22, 0.14)",
  maxHeight: 320,
  overflowY: "auto" as const,
} as const;

function optionButtonStyle(isSelected: boolean, isHighlighted: boolean) {
  return {
    display: "grid",
    gap: 4,
    textAlign: "left" as const,
    border: isHighlighted ? "1px solid rgba(180, 83, 42, 0.34)" : "1px solid rgba(232, 217, 202, 0.9)",
    borderRadius: 14,
    background: isSelected || isHighlighted ? "rgba(181, 66, 31, 0.08)" : "#fff",
    padding: "12px 14px",
    cursor: "pointer",
    color: "inherit",
    font: "inherit",
  };
}

const emptyStateStyle = {
  padding: "14px 12px",
  borderRadius: 14,
  background: "rgba(244, 232, 217, 0.45)",
  color: "var(--muted)",
  lineHeight: 1.6,
} as const;
