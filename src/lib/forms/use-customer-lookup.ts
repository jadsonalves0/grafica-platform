"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { SearchableSelectOption } from "@/components/forms/searchable-select";

export type CustomerLookupOption = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  document?: string | null;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export function useCustomerLookup({
  initialCustomers = [],
  includeInactive = false,
}: Readonly<{
  initialCustomers?: CustomerLookupOption[];
  includeInactive?: boolean;
}>) {
  const [customers, setCustomers] = useState<CustomerLookupOption[]>(initialCustomers);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCustomers.length) {
      return;
    }

    mergeCustomers(initialCustomers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomers]);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery.length < 2) {
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();

    async function searchCustomers() {
      setIsSearching(true);
      setSearchError(null);

      try {
        const params = new URLSearchParams();
        params.set("search", normalizedQuery);
        if (includeInactive) {
          params.set("includeInactive", "true");
        }

        const response = await fetch(`/api/customers?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<CustomerLookupOption[]>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Nao foi possivel pesquisar os clientes.");
        }

        mergeCustomers(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setSearchError(
          error instanceof Error ? error.message : "Falha ao pesquisar os clientes.",
        );
      } finally {
        setIsSearching(false);
      }
    }

    const timeout = window.setTimeout(searchCustomers, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, includeInactive]);

  const customerLookupOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
        description:
          [customer.document, customer.whatsapp, customer.phone, customer.email]
            .filter(Boolean)
            .join(" | ") || undefined,
        keywords: [
          customer.document ?? "",
          customer.whatsapp ?? "",
          customer.phone ?? "",
          customer.email ?? "",
        ],
      })),
    [customers],
  );

  function mergeCustomers(nextCustomers: CustomerLookupOption[]) {
    setCustomers((current) => {
      const customerMap = new Map(current.map((customer) => [customer.id, customer]));

      for (const customer of nextCustomers) {
        customerMap.set(customer.id, customer);
      }

      return [...customerMap.values()].sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR"),
      );
    });
  }

  function registerCustomer(customer: CustomerLookupOption) {
    mergeCustomers([customer]);
  }

  return {
    currentQuery: query,
    customers,
    customerLookupOptions,
    isSearching,
    searchError,
    setQuery,
    mergeCustomers,
    registerCustomer,
  };
}
