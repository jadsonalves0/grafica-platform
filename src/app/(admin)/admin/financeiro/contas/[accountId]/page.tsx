"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AccountForm } from "@/app/(admin)/admin/financeiro/_components/account-form";

type AccountDetail = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "DIGITAL_WALLET";
  initialBalance: number;
  createdAt: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function EditarContaFinanceiraPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccount() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/financial/accounts/${accountId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResult<AccountDetail>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar a conta.");
          return;
        }

        setAccount(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setErrorMessage("Falha ao consultar a conta.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAccount();

    return () => controller.abort();
  }, [accountId]);

  if (isLoading) {
    return (
      <main style={{ padding: 32 }}>
        <section style={loadingPanelStyle}>
          <strong>Carregando conta...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos trazendo os dados financeiros.</span>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 980, display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
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
            Base financeira
          </p>
          <h1 style={{ margin: "12px 0 8px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
            Editar conta financeira
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
            Ajuste nome, tipo e saldo inicial da conta usada pela operacao.
          </p>
        </div>

        <Link href="/admin/financeiro" style={secondaryButtonStyle}>
          Voltar para financeiro
        </Link>
      </div>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}

      {account ? (
        <AccountForm
          mode="edit"
          accountId={account.id}
          initialState={{
            name: account.name,
            type: account.type,
            initialBalance: new Intl.NumberFormat("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(account.initialBalance),
          }}
          metadata={{ createdAt: account.createdAt }}
        />
      ) : null}
    </main>
  );
}

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

const loadingPanelStyle = {
  display: "grid",
  gap: 10,
  placeItems: "center",
  padding: 42,
  borderRadius: 24,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.62)",
} as const;
