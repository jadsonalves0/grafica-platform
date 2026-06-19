"use client";

import { useEffect, useRef } from "react";

type UnsavedChangesOptions = {
  enabled?: boolean;
  message?: string;
};

export function useUnsavedChanges(
  isDirty: boolean,
  options: UnsavedChangesOptions = {},
) {
  const {
    enabled = true,
    message = "Existem alteracoes nao salvas. Deseja sair mesmo assim?",
  } = options;
  const bypassRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (bypassRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = message;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (bypassRef.current) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]");

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href || href.startsWith("#") || anchor.getAttribute("target") === "_blank") {
        return;
      }

      const confirmed = window.confirm(message);

      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      bypassRef.current = true;
      window.setTimeout(() => {
        bypassRef.current = false;
      }, 1500);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [enabled, isDirty, message]);

  return {
    confirmDiscard: () => {
      if (!enabled || !isDirty) {
        return true;
      }

      const confirmed = window.confirm(message);
      if (confirmed) {
        bypassRef.current = true;
        window.setTimeout(() => {
          bypassRef.current = false;
        }, 1500);
      }
      return confirmed;
    },
    allowNextNavigation: () => {
      bypassRef.current = true;
      window.setTimeout(() => {
        bypassRef.current = false;
      }, 1500);
    },
  };
}
