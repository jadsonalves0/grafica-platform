"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  formatPhone,
  isValidEmail,
  isValidPhone,
  normalizeEmailInput,
} from "@/lib/forms/br-utils";

type SitePublicData = {
  company: {
    id: string;
    tradeName: string;
    slug: string;
  };
  settings: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    aboutText?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    addressFull?: string | null;
    isSitePublished: boolean;
  } | null;
  services: Array<{
    id: string;
    title: string;
    shortDescription?: string | null;
    imageUrl?: string | null;
  }>;
  banners: Array<{
    id: string;
    title?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaLink?: string | null;
  }>;
};

type LeadFormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  subject: string;
  requestedService: string;
  message: string;
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const defaultLeadForm: LeadFormState = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  subject: "",
  requestedService: "",
  message: "",
};

export default function CompanySitePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [site, setSite] = useState<SitePublicData | null>(null);
  const [form, setForm] = useState<LeadFormState>(defaultLeadForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    async function loadSite() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/public/site/${slug}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<SitePublicData>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar o site publico.");
          return;
        }

        setSite(result.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar o site publico.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSite();

    return () => controller.abort();
  }, [slug]);

  const palette = useMemo(
    () => ({
      primary: site?.settings?.primaryColor || "#b5421f",
      secondary: site?.settings?.secondaryColor || "#f5ede3",
      accent: site?.settings?.accentColor || "#2b6e52",
      ink: "#1f1813",
      muted: "#6b5848",
    }),
    [site?.settings?.accentColor, site?.settings?.primaryColor, site?.settings?.secondaryColor],
  );

  const heroTitle = site?.settings?.heroTitle || `${site?.company.tradeName ?? "Grafica"} com atendimento rapido e acabamento profissional`;
  const heroSubtitle =
    site?.settings?.heroSubtitle ||
    "Site institucional com captacao de orcamentos, apresentacao dos servicos e uma jornada comercial mais clara para o cliente.";

  const marqueeItems = useMemo(() => {
    const names = site?.services.map((service) => service.title).filter(Boolean) ?? [];
    return names.length ? [...names, ...names] : ["Cartoes", "Panfletos", "Adesivos", "Banners", "Fachadas", "Papelaria"];
  }, [site?.services]);

  function updateField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateLeadForm() {
    if (form.name.trim().length < 2) {
      return "Informe seu nome para solicitar o orcamento.";
    }

    if (!form.email && !form.phone && !form.whatsapp) {
      return "Informe pelo menos um meio de contato: e-mail, telefone ou WhatsApp.";
    }

    if (form.email && !isValidEmail(form.email)) {
      return "Informe um e-mail valido.";
    }

    if (form.phone && !isValidPhone(form.phone)) {
      return "Informe um telefone valido com DDD.";
    }

    if (form.whatsapp && !isValidPhone(form.whatsapp)) {
      return "Informe um WhatsApp valido com DDD.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site) return;

    const validationMessage = validateLeadForm();

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
          companyId: site.company.id,
          ...form,
          name: form.name.trim(),
          email: form.email ? normalizeEmailInput(form.email) : "",
        }),
      });

      const result = (await response.json()) as ApiResult<{ created: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel enviar o pedido de contato.");
        return;
      }

      setForm(defaultLeadForm);
      setSuccessMessage("Pedido enviado com sucesso. O time comercial vai entrar em contato.");
    } catch {
      setErrorMessage("Falha ao enviar o pedido de contato.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main style={mainStyle(palette)}>
        <section style={centerPanelStyle}>
          <strong>Carregando site publico...</strong>
          <span style={{ color: palette.muted }}>Estamos preparando a apresentacao da grafica.</span>
        </section>
      </main>
    );
  }

  if (!site) {
    return (
      <main style={mainStyle(palette)}>
        <section style={centerPanelStyle}>
          <strong>Site nao encontrado.</strong>
          <span style={{ color: palette.muted }}>
            Verifique o endereco publico configurado para a grafica.
          </span>
        </section>
      </main>
    );
  }

  return (
    <main style={mainStyle(palette)}>
      <style jsx>{`
        .float-card {
          animation: floatCard 8s ease-in-out infinite;
        }

        .float-card.delay {
          animation-delay: 1.2s;
        }

        .ticker-track {
          animation: ticker 22s linear infinite;
        }

        .pulse-ring {
          animation: pulseRing 4s ease-in-out infinite;
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 80px", display: "grid", gap: 28 }}>
        {!site.settings?.isSitePublished ? (
          <div
            style={{
              padding: 14,
              borderRadius: 16,
              background: "rgba(181, 66, 31, 0.1)",
              color: palette.primary,
              fontWeight: 600,
            }}
          >
            Este site esta em modo preview. Use o painel interno para finalizar o conteudo e publicar.
          </div>
        ) : null}

        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            padding: "16px 22px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.65)",
            backdropFilter: "blur(18px)",
            position: "sticky",
            top: 16,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LogoMark tradeName={site.company.tradeName} logoUrl={site.settings?.logoUrl || null} palette={palette} />
            <div>
              <p style={{ margin: 0, color: palette.primary, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
                Grafica rapida
              </p>
              <strong style={{ fontSize: 22 }}>{site.company.tradeName}</strong>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="#servicos" style={ghostLinkStyle}>
              Servicos
            </Link>
            <Link href="#estrutura" style={ghostLinkStyle}>
              Diferenciais
            </Link>
            <Link href="#contato" style={ghostLinkStyle}>
              Contato
            </Link>
            <Link href="#orcamento" style={ctaButtonStyle(palette.primary, "#fff")}>
              Pedir orcamento
            </Link>
          </nav>
        </header>

        <section
          style={{
            position: "relative",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(360px, 0.9fr)",
            gap: 24,
            padding: 36,
            borderRadius: 36,
            background:
              `radial-gradient(circle at top right, ${withAlpha(palette.accent, 0.18)}, transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(251,246,239,0.92) 100%)`,
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 28px 80px rgba(45, 23, 11, 0.1)",
          }}
        >
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 220,
              height: 220,
              borderRadius: "999px",
              background: withAlpha(palette.primary, 0.1),
              filter: "blur(4px)",
            }}
          />

          <div style={{ display: "grid", gap: 20, position: "relative" }}>
            <p style={{ margin: 0, color: palette.primary, textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 12, fontWeight: 700 }}>
              Impressao, acabamento e agilidade comercial
            </p>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(3.4rem, 8vw, 6.2rem)",
                lineHeight: 0.92,
                maxWidth: 760,
                color: palette.ink,
              }}
            >
              {heroTitle}
            </h1>
            <p style={{ margin: 0, maxWidth: 720, fontSize: 19, lineHeight: 1.8, color: palette.muted }}>
              {heroSubtitle}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {site.settings?.contactWhatsapp ? (
                <Link
                  href={`https://wa.me/${normalizeLinkPhone(site.settings.contactWhatsapp)}`}
                  target="_blank"
                  style={ctaButtonStyle(palette.primary, "#fff")}
                >
                  Falar no WhatsApp
                </Link>
              ) : null}
              <Link href="#orcamento" style={secondaryButtonStyle}>
                Solicitar proposta
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
                maxWidth: 760,
              }}
            >
              <ShowcaseMetric label="Servicos em destaque" value={String(Math.max(site.services.length, 6))} palette={palette} />
              <ShowcaseMetric label="Canais de contato" value={String(countContactChannels(site))} palette={palette} />
              <ShowcaseMetric label="Atendimento" value="Rapido" palette={palette} />
            </div>
          </div>

          <div style={{ position: "relative", minHeight: 520 }}>
            <div
              className="float-card"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "76%",
                padding: 18,
                borderRadius: 28,
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(255,255,255,0.8)",
                boxShadow: "0 28px 60px rgba(46, 23, 11, 0.12)",
              }}
            >
              <MediaPanel
                title={site.banners[0]?.title || "Campanha em destaque"}
                subtitle={site.banners[0]?.subtitle || "Espaco ideal para destacar um servico, prazo especial ou promocao comercial."}
                imageUrl={site.banners[0]?.imageUrl || null}
                palette={palette}
                tall
              />
            </div>

            <div
              className="float-card delay"
              style={{
                position: "absolute",
                bottom: 22,
                left: 0,
                width: "72%",
                display: "grid",
                gap: 14,
                padding: 20,
                borderRadius: 26,
                background: palette.secondary,
                border: `1px solid ${withAlpha(palette.primary, 0.12)}`,
                boxShadow: "0 24px 48px rgba(46, 23, 11, 0.1)",
              }}
            >
              <strong style={{ fontSize: 24 }}>Paineis de atendimento</strong>
              <div style={{ display: "grid", gap: 10 }}>
                <InfoChip label="WhatsApp" value={site.settings?.contactWhatsapp ? formatPhone(site.settings.contactWhatsapp) : "Nao informado"} palette={palette} />
                <InfoChip label="Telefone" value={site.settings?.contactPhone ? formatPhone(site.settings.contactPhone) : "Nao informado"} palette={palette} />
                <InfoChip label="E-mail" value={site.settings?.contactEmail || "Nao informado"} palette={palette} />
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: 82,
                left: 18,
                width: 94,
                height: 94,
                borderRadius: 24,
                background: withAlpha(palette.accent, 0.16),
                border: `1px solid ${withAlpha(palette.accent, 0.18)}`,
                display: "grid",
                placeItems: "center",
                color: palette.accent,
                fontWeight: 800,
                boxShadow: "0 18px 40px rgba(43, 110, 82, 0.12)",
              }}
            >
              24h
            </div>
          </div>
        </section>

        <section
          style={{
            overflow: "hidden",
            borderRadius: 20,
            border: `1px solid ${withAlpha(palette.primary, 0.12)}`,
            background: "rgba(255,255,255,0.7)",
          }}
        >
          <div
            className="ticker-track"
            style={{
              display: "flex",
              gap: 36,
              width: "max-content",
              padding: "14px 18px",
            }}
          >
            {marqueeItems.map((item, index) => (
              <span
                key={`${item}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 700,
                  color: palette.ink,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "999px",
                    background: palette.primary,
                    display: "inline-block",
                  }}
                />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section id="servicos" style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ maxWidth: 720 }}>
              <p style={sectionEyebrowStyle(palette.primary)}>Vitrine comercial</p>
              <h2 style={sectionTitleStyle}>Servicos que ganham destaque no site</h2>
              <p style={{ margin: 0, color: palette.muted, lineHeight: 1.8 }}>
                Organize seu mix de servicos com imagem, descricao curta e linguagem comercial para facilitar o pedido de orcamento.
              </p>
            </div>
            <Link href="#orcamento" style={secondaryButtonStyle}>
              Falar com o comercial
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            {(site.services.length ? site.services : fallbackServices(site.company.tradeName)).map((service, index) => (
              <article
                key={service.id}
                style={{
                  display: "grid",
                  gap: 16,
                  padding: 18,
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.86)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 18px 36px rgba(47, 24, 12, 0.08)",
                }}
              >
                <MediaPanel
                  title={service.title}
                  subtitle={service.shortDescription || "Descricao comercial curta para reforcar prazo, acabamento e aplicacao do servico."}
                  imageUrl={"imageUrl" in service ? service.imageUrl || null : null}
                  palette={palette}
                  compact
                  badge={`0${(index % 9) + 1}`}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: 24 }}>{service.title}</h3>
                  <p style={{ margin: "8px 0 0", color: palette.muted, lineHeight: 1.7 }}>
                    {service.shortDescription || "Descricao resumida para o servico exibido no site."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="estrutura" style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.9fr)", alignItems: "start" }}>
          <div
            style={{
              display: "grid",
              gap: 18,
              padding: 28,
              borderRadius: 28,
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(255,255,255,0.72)",
              boxShadow: "0 20px 48px rgba(47, 24, 12, 0.08)",
            }}
          >
            <div>
              <p style={sectionEyebrowStyle(palette.accent)}>Diferenciais</p>
              <h2 style={sectionTitleStyle}>Estrutura para vender melhor e produzir com mais clareza</h2>
              <p style={{ margin: 0, color: palette.muted, lineHeight: 1.8 }}>
                O site conversa com o sistema interno para captacao de leads e orcamentos, enquanto a operacao organiza clientes, pedidos, estoque, producao e financeiro.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {[
                "Atendimento comercial mais organizado",
                "Formulario que leva o lead direto para o painel",
                "Servicos destacados com linguagem mais profissional",
                "Base pronta para evoluir para mais graficas",
              ].map((text, index) => (
                <div
                  key={text}
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: 18,
                    borderRadius: 20,
                    background: index % 2 === 0 ? "rgba(245, 239, 231, 0.85)" : "rgba(255,255,255,0.9)",
                    border: `1px solid ${withAlpha(palette.primary, 0.1)}`,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: withAlpha(palette.primary, 0.1),
                      color: palette.primary,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                    }}
                  >
                    0{index + 1}
                  </div>
                  <strong style={{ fontSize: 18 }}>{text}</strong>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {(site.banners.length ? site.banners : fallbackBanners()).map((banner, index) => (
              <article
                key={banner.id}
                style={{
                  display: "grid",
                  gap: 14,
                  padding: 18,
                  borderRadius: 24,
                  background: index % 2 === 0 ? "rgba(255,255,255,0.86)" : "rgba(245, 239, 231, 0.92)",
                  border: "1px solid rgba(255,255,255,0.74)",
                  boxShadow: "0 16px 36px rgba(47, 24, 12, 0.07)",
                }}
              >
                <MediaPanel
                  title={banner.title || "Destaque comercial"}
                  subtitle={banner.subtitle || "Espaco para campanhas, prazo especial ou argumento de venda."}
                  imageUrl={banner.imageUrl || null}
                  palette={palette}
                  compact
                />
                {banner.ctaLabel && banner.ctaLink ? (
                  <Link href={banner.ctaLink} target="_blank" style={ghostLinkStyle}>
                    {banner.ctaLabel}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.95fr)",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 20 }}>
            <div
              style={{
                display: "grid",
                gap: 18,
                padding: 28,
                borderRadius: 28,
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(255,255,255,0.72)",
                boxShadow: "0 20px 48px rgba(47, 24, 12, 0.08)",
              }}
            >
              <p style={sectionEyebrowStyle(palette.primary)}>Sobre a grafica</p>
              <h2 style={sectionTitleStyle}>Conte uma historia mais forte para o cliente confiar antes mesmo do primeiro contato</h2>
              <p style={{ margin: 0, color: palette.muted, lineHeight: 1.85 }}>
                {site.settings?.aboutText ||
                  "Use este espaco para posicionar a grafica, explicar o perfil de atendimento, mostrar diferenciais de prazo, acabamento, consultoria e capacidade produtiva."}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <PosterTile label="Briefing" color={palette.primary} />
              <PosterTile label="Aprovacao" color={palette.accent} />
              <PosterTile label="Entrega" color={palette.ink} />
            </div>
          </div>

          <section
            id="orcamento"
            style={{
              display: "grid",
              gap: 18,
              padding: 26,
              borderRadius: 28,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 24px 56px rgba(47, 24, 12, 0.1)",
              position: "sticky",
              top: 98,
            }}
          >
            <div>
              <p style={sectionEyebrowStyle(palette.accent)}>Conversao</p>
              <h2 style={sectionTitleStyle}>Solicite um orcamento</h2>
              <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>
                Preencha o formulario e leve o lead direto para o painel interno da grafica.
              </p>
            </div>

            {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
            {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Seu nome"
                style={inputStyle}
              />
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", normalizeEmailInput(event.target.value))}
                placeholder="Seu e-mail"
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", formatPhone(event.target.value))}
                  placeholder="Telefone"
                  inputMode="tel"
                  maxLength={15}
                  style={inputStyle}
                />
                <input
                  value={form.whatsapp}
                  onChange={(event) => updateField("whatsapp", formatPhone(event.target.value))}
                  placeholder="WhatsApp"
                  inputMode="tel"
                  maxLength={15}
                  style={inputStyle}
                />
              </div>
              <input
                value={form.requestedService}
                onChange={(event) => updateField("requestedService", event.target.value)}
                placeholder="Servico desejado"
                style={inputStyle}
              />
              <input
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Assunto"
                style={inputStyle}
              />
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Descreva o que voce precisa"
                rows={5}
                style={{ ...inputStyle, minHeight: 150, height: "auto", padding: 14 }}
              />
              <button type="submit" disabled={isSubmitting} style={ctaButtonStyle(palette.primary, "#fff")}>
                {isSubmitting ? "Enviando..." : "Enviar pedido"}
              </button>
            </form>

            <div id="contato" style={{ display: "grid", gap: 10, paddingTop: 8, borderTop: `1px solid ${withAlpha(palette.primary, 0.12)}` }}>
              <InfoChip label="Telefone" value={site.settings?.contactPhone ? formatPhone(site.settings.contactPhone) : "Nao informado"} palette={palette} />
              <InfoChip label="WhatsApp" value={site.settings?.contactWhatsapp ? formatPhone(site.settings.contactWhatsapp) : "Nao informado"} palette={palette} />
              <InfoChip label="E-mail" value={site.settings?.contactEmail || "Nao informado"} palette={palette} />
              <InfoChip label="Endereco" value={site.settings?.addressFull || "Nao informado"} palette={palette} />
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function LogoMark({
  tradeName,
  logoUrl,
  palette,
}: Readonly<{
  tradeName: string;
  logoUrl: string | null;
  palette: { primary: string };
}>) {
  if (logoUrl) {
    return (
      <div
        aria-label={tradeName}
        role="img"
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundImage: `url(${logoUrl})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          border: "1px solid rgba(255,255,255,0.78)",
          boxShadow: "0 14px 30px rgba(40, 20, 10, 0.12)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: palette.primary,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: 24,
        boxShadow: "0 14px 30px rgba(40, 20, 10, 0.12)",
      }}
    >
      {tradeName.slice(0, 2).toUpperCase()}
    </div>
  );
}

function MediaPanel({
  title,
  subtitle,
  imageUrl,
  palette,
  compact,
  tall,
  badge,
}: Readonly<{
  title: string;
  subtitle: string;
  imageUrl: string | null;
  palette: { primary: string; accent: string; secondary: string; ink: string };
  compact?: boolean;
  tall?: boolean;
  badge?: string;
}>) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: tall ? 320 : compact ? 180 : 220,
        borderRadius: 24,
        background: imageUrl
          ? `linear-gradient(180deg, rgba(20,16,13,0.05), rgba(20,16,13,0.4)), url(${imageUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, ${withAlpha(palette.primary, 0.16)} 0%, ${withAlpha(palette.accent, 0.2)} 100%)`,
        display: "flex",
        alignItems: "flex-end",
        padding: 18,
      }}
    >
      {!imageUrl ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 18,
              borderRadius: 20,
              border: `1px solid ${withAlpha(palette.primary, 0.18)}`,
              background:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 12px, transparent 12px, transparent 24px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              width: 84,
              height: 84,
              borderRadius: 20,
              background: withAlpha(palette.ink, 0.08),
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              color: palette.ink,
            }}
          >
            {badge || title.slice(0, 2).toUpperCase()}
          </div>
        </>
      ) : null}

      <div
        style={{
          position: "relative",
          display: "grid",
          gap: 8,
          width: "100%",
          padding: 14,
          borderRadius: 18,
          background: "rgba(255,255,255,0.86)",
          boxShadow: "0 18px 36px rgba(24, 13, 7, 0.1)",
        }}
      >
        <strong style={{ fontSize: compact ? 22 : 26 }}>{title}</strong>
        <span style={{ color: "#6b5848", lineHeight: 1.6 }}>{subtitle}</span>
      </div>
    </div>
  );
}

function ShowcaseMetric({
  label,
  value,
  palette,
}: Readonly<{
  label: string;
  value: string;
  palette: { primary: string; secondary: string };
}>) {
  return (
    <article
      style={{
        padding: 16,
        borderRadius: 18,
        background: "rgba(255,255,255,0.76)",
        border: `1px solid ${withAlpha(palette.primary, 0.12)}`,
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "#6b5848", fontSize: 13 }}>{label}</span>
      <strong style={{ fontSize: 28 }}>{value}</strong>
    </article>
  );
}

function InfoChip({
  label,
  value,
  palette,
}: Readonly<{
  label: string;
  value: string;
  palette: { primary: string; accent: string };
}>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(245, 239, 231, 0.92)",
      }}
    >
      <span style={{ color: palette.accent, fontWeight: 700 }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function PosterTile({ label, color }: Readonly<{ label: string; color: string }>) {
  return (
    <div
      style={{
        minHeight: 180,
        borderRadius: 24,
        padding: 18,
        background: `linear-gradient(135deg, ${withAlpha(color, 0.14)} 0%, rgba(255,255,255,0.86) 100%)`,
        border: `1px solid ${withAlpha(color, 0.18)}`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        boxShadow: "0 16px 36px rgba(47, 24, 12, 0.08)",
      }}
    >
      <strong style={{ fontSize: 22 }}>{label}</strong>
      <span style={{ fontWeight: 800, color }}>PP</span>
    </div>
  );
}

function fallbackServices(tradeName: string) {
  return [
    {
      id: "fallback-1",
      title: "Cartoes e papelaria",
      shortDescription: `${tradeName} pode destacar impressos de apresentacao, papel timbrado, envelopes e kits comerciais.`,
    },
    {
      id: "fallback-2",
      title: "Adesivos e rotulos",
      shortDescription: "Use o site para vender tiragens rapidas, acabamento e aplicacoes especiais com mais clareza.",
    },
    {
      id: "fallback-3",
      title: "Banners e comunicacao visual",
      shortDescription: "Apresente faixas, banners, placas e pecas de alto impacto com linguagem comercial mais forte.",
    },
  ];
}

function fallbackBanners() {
  return [
    {
      id: "fallback-banner-1",
      title: "Entrega agil para demandas urgentes",
      subtitle: "Espaco ideal para destacar prazo, atendimento consultivo e velocidade comercial.",
      imageUrl: null,
      ctaLabel: "Pedir orcamento",
      ctaLink: "#orcamento",
    },
    {
      id: "fallback-banner-2",
      title: "Acabamento profissional para sua marca",
      subtitle: "Traga para o site argumentos de valor, nao apenas lista de servicos.",
      imageUrl: null,
      ctaLabel: "Falar com o time",
      ctaLink: "#contato",
    },
  ];
}

function countContactChannels(site: SitePublicData) {
  return [
    site.settings?.contactPhone,
    site.settings?.contactWhatsapp,
    site.settings?.contactEmail,
    site.settings?.instagramUrl,
    site.settings?.facebookUrl,
  ].filter(Boolean).length;
}

function normalizeLinkPhone(value: string) {
  return value.replace(/\D/g, "");
}

function withAlpha(hex: string, opacity: number) {
  const sanitized = hex.replace("#", "");
  const normalized = sanitized.length === 3
    ? sanitized
        .split("")
        .map((char) => char + char)
        .join("")
    : sanitized;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function mainStyle(palette: { secondary: string; primary: string; accent: string }) {
  return {
    minHeight: "100vh",
    background: `radial-gradient(circle at top left, ${withAlpha(palette.primary, 0.12)}, transparent 26%), radial-gradient(circle at bottom right, ${withAlpha(palette.accent, 0.12)}, transparent 26%), linear-gradient(180deg, ${palette.secondary} 0%, #fffdf8 100%)`,
  };
}

function ctaButtonStyle(background: string, color: string) {
  return {
    height: 50,
    padding: "0 20px",
    borderRadius: 14,
    border: 0,
    background,
    color,
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  } as const;
}

const secondaryButtonStyle = {
  height: 50,
  padding: "0 20px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(255,255,255,0.78)",
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const ghostLinkStyle = {
  height: 50,
  padding: "0 20px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(255,255,255,0.75)",
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const inputStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(181, 66, 31, 0.14)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const feedbackStyle = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 14,
  lineHeight: 1.6,
} as const;

const errorStyle = {
  background: "rgba(181, 66, 31, 0.12)",
  color: "#8a2e16",
} as const;

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
} as const;

const centerPanelStyle = {
  maxWidth: 680,
  margin: "0 auto",
  minHeight: "100vh",
  padding: "0 24px",
  display: "grid",
  placeItems: "center",
  textAlign: "center" as const,
  gap: 10,
} as const;

function sectionEyebrowStyle(color: string) {
  return {
    margin: 0,
    color,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    fontSize: 12,
    fontWeight: 700,
  } as const;
}

const sectionTitleStyle = {
  margin: "10px 0 10px",
  fontFamily: "var(--font-heading)",
  fontSize: 38,
  lineHeight: 1.04,
} as const;
