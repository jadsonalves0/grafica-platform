"use client";

import { useEffect, useState } from "react";
import { normalizeEmailInput, normalizeSlugInput } from "@/lib/forms/br-utils";

export const dynamic = "force-dynamic";

type LoginFormState = {
  companySlug: string;
  email: string;
  password: string;
};

const initialState: LoginFormState = {
  companySlug: "",
  email: "",
  password: "",
};

export default function LoginPage() {
  const [form, setForm] = useState<LoginFormState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.companySlug.trim()) {
      setErrorMessage("Informe a empresa para entrar.");
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage("Informe o e-mail da conta.");
      return;
    }

    if (!form.password.trim()) {
      setErrorMessage("Informe a senha da conta.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel entrar. Confira os dados.");
        return;
      }

      window.location.assign("/dashboard");
      return;
    } catch {
      setErrorMessage("Falha ao conectar com o servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(field: keyof LoginFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main
      className="admin-theme"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--background)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 32,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          boxShadow: "0 18px 60px rgba(77, 39, 22, 0.08)",
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
          Acesso interno
        </p>
        <h1
          style={{
            margin: "16px 0 10px",
            fontFamily: "var(--font-heading)",
            fontSize: 40,
          }}
        >
          Entrar na plataforma
        </h1>
        <p style={{ margin: "0 0 24px", color: "var(--muted)", lineHeight: 1.6 }}>
          Informe a empresa, o e-mail e a senha da conta autorizada para acessar a
          plataforma.
        </p>

        <form
          style={{ display: "grid", gap: 16 }}
          onSubmit={handleSubmit}
          data-ui-ready={isHydrated ? "true" : "false"}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span>Empresa</span>
            <input
              value={form.companySlug}
              onChange={(event) => updateField("companySlug", normalizeSlugInput(event.target.value))}
              placeholder="slug-da-grafica"
              style={{
                height: 48,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "#fff",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", normalizeEmailInput(event.target.value))}
              placeholder="voce@empresa.com"
              style={{
                height: 48,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "#fff",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span>Senha</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="********"
              style={{
                height: 48,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "#fff",
              }}
            />
          </label>

          {errorMessage ? (
            <p
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(181, 66, 31, 0.12)",
                color: "var(--primary)",
                lineHeight: 1.5,
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !isHydrated}
            style={{
              height: 50,
              borderRadius: 14,
              border: 0,
              background: "var(--primary)",
              color: "#fff",
              fontWeight: 700,
              cursor: isSubmitting ? "wait" : isHydrated ? "pointer" : "default",
              opacity: isSubmitting || !isHydrated ? 0.8 : 1,
            }}
          >
            {isSubmitting ? "Entrando..." : isHydrated ? "Entrar" : "Preparando..."}
          </button>
        </form>
      </section>
    </main>
  );
}
