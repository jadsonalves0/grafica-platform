"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { SearchableSelectOption } from "@/components/forms/searchable-select";

export type SupplierLookupOption = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  displayName: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  contactName?: string | null;
  isActive?: boolean;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export function useSupplierLookup({
  initialSuppliers = [],
  includeInactive = false,
}: Readonly<{
  initialSuppliers?: SupplierLookupOption[];
  includeInactive?: boolean;
}>) {
  const [suppliers, setSuppliers] = useState<SupplierLookupOption[]>(initialSuppliers);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSuppliers.length) {
      return;
    }

    mergeSuppliers(initialSuppliers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSuppliers]);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery.length < 2) {
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();

    async function searchSuppliers() {
      setIsSearching(true);
      setSearchError(null);

      try {
        const params = new URLSearchParams();
        params.set("search", normalizedQuery);
        if (includeInactive) {
          params.set("includeInactive", "true");
        }

        const response = await fetch(`/api/suppliers?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<SupplierLookupOption[]>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Nao foi possivel pesquisar os fornecedores.");
        }

        mergeSuppliers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setSearchError(
          error instanceof Error ? error.message : "Falha ao pesquisar os fornecedores.",
        );
      } finally {
        setIsSearching(false);
      }
    }

    const timeout = window.setTimeout(searchSuppliers, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, includeInactive]);

  const supplierLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.displayName,
        description:
          [
            supplier.document,
            supplier.contactName,
            supplier.whatsapp,
            supplier.phone,
            supplier.email,
          ]
            .filter(Boolean)
            .join(" | ") || undefined,
        keywords: [
          supplier.legalName,
          supplier.tradeName ?? "",
          supplier.document ?? "",
          supplier.contactName ?? "",
          supplier.whatsapp ?? "",
          supplier.phone ?? "",
          supplier.email ?? "",
        ],
      })),
    [suppliers],
  );

  function mergeSuppliers(nextSuppliers: SupplierLookupOption[]) {
    setSuppliers((current) => {
      const supplierMap = new Map(current.map((supplier) => [supplier.id, supplier]));

      for (const supplier of nextSuppliers) {
        supplierMap.set(supplier.id, supplier);
      }

      return [...supplierMap.values()].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "pt-BR"),
      );
    });
  }

  function registerSupplier(supplier: SupplierLookupOption) {
    mergeSuppliers([supplier]);
  }

  return {
    currentQuery: query,
    suppliers,
    supplierLookupOptions,
    isSearching,
    searchError,
    setQuery,
    mergeSuppliers,
    registerSupplier,
  };
}
