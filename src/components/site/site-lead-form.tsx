"use client";

import { useEffect, useState } from "react";

import { formatPhone, isValidEmail, isValidPhone, normalizeEmailInput } from "@/lib/forms/br-utils";
import {
  extractSiteLeadTrackingContext,
  formatSiteLeadReference,
} from "@/lib/site/site-lead-context";
import styles from "./site-lead-form.module.css";

type SiteLeadFormProps = {
  companyId: string;
  companyName: string;
  initialRequestedService?: string;
  whatsapp?: string | null;
};

type LeadFormState = {
  name: string;
  whatsapp: string;
  email: string;
  requestedService: string;
  message: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const defaultState: LeadFormState = {
  name: "",
  whatsapp: "",
  email: "",
  requestedService: "",
  message: "",
};

export function SiteLeadForm({
  companyId,
  companyName,
  initialRequestedService = "",
  whatsapp,
}: Readonly<SiteLeadFormProps>) {
  const [form, setForm] = useState<LeadFormState>(() => ({
    ...defaultState,
    requestedService: initialRequestedService,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [trackingContext, setTrackingContext] = useState(() =>
    extractSiteLeadTrackingContext({}),
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      requestedService: initialRequestedService || current.requestedService,
    }));
  }, [initialRequestedService]);

  useEffect(() => {
    setTrackingContext(
      extractSiteLeadTrackingContext({
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        referrer: document.referrer,
      }),
    );
  }, []);

  function updateField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (form.name.trim().length < 2) {
      return "Informe seu nome para enviar a solicitacao.";
    }

    if (!form.whatsapp.trim()) {
      return "Informe um WhatsApp para retorno da equipe.";
    }

    if (!isValidPhone(form.whatsapp)) {
      return "Informe um WhatsApp valido com DDD.";
    }

    if (form.email && !isValidEmail(form.email)) {
      return "Informe um e-mail valido ou deixe o campo em branco.";
    }

    if (form.message.trim().length < 8) {
      return "Descreva rapidamente o que voce precisa para receber uma proposta melhor.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          name: form.name.trim(),
          whatsapp: form.whatsapp,
          email: form.email ? normalizeEmailInput(form.email) : "",
          ...trackingContext,
          requestedService: form.requestedService,
          subject: form.requestedService || "Contato pelo website",
          message: form.message.trim(),
        }),
      });

      const result = (await response.json()) as ApiResult<{
        created: true;
        leadId: string;
        origin: string;
      }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel enviar sua solicitacao agora.");
        return;
      }

      const reference = formatSiteLeadReference(result.data?.leadId);
      setSuccessMessage(
        reference
          ? `Solicitacao enviada com sucesso. Recebemos seu contato e a equipe retornara em breve. Referencia ${reference}.`
          : "Solicitacao enviada com sucesso. Recebemos seu contato e a equipe retornara em breve.",
      );
      setForm({
        ...defaultState,
        requestedService: form.requestedService,
      });
    } catch {
      setErrorMessage("Falha ao enviar a solicitacao. Tente novamente em alguns instantes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const whatsappHref = buildWhatsappHref(
    whatsapp || "",
    `Ola, gostaria de solicitar um orcamento com a ${companyName}.`,
  );

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Nome</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
            />
          </label>

          <label className={styles.field}>
            <span>WhatsApp</span>
            <input
              value={form.whatsapp}
              onChange={(event) => updateField("whatsapp", formatPhone(event.target.value))}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
              maxLength={15}
            />
          </label>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>E-mail opcional</span>
            <input
              value={form.email}
              onChange={(event) => updateField("email", normalizeEmailInput(event.target.value))}
              placeholder="voce@empresa.com.br"
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className={styles.field}>
            <span>Servico desejado</span>
            <input
              value={form.requestedService}
              onChange={(event) => updateField("requestedService", event.target.value)}
              placeholder="Ex.: Cartoes de visita"
              autoComplete="off"
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Mensagem</span>
          <textarea
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="Conte quantidades, prazos ou o tipo de material que voce procura."
            rows={5}
          />
        </label>

        {errorMessage ? <div className={styles.alertDanger}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.alertSuccess}>{successMessage}</div> : null}

        <div className={styles.actions}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Solicitar orcamento"}
          </button>

          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              Falar pelo WhatsApp
            </a>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function buildWhatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
