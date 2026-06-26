import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import type {
  SiteCtaConfig,
  SiteDifferentialItem,
  SiteHowItWorksItem,
  SitePublicData,
} from "@/lib/site/site-home";
import { formatPhone } from "@/lib/forms/br-utils";
import { SiteLeadForm } from "@/components/site/site-lead-form";
import styles from "./site-home-view.module.css";

type SiteLeadFormConfig = {
  companyId: string;
  companyName: string;
  initialRequestedService?: string;
  whatsapp?: string | null;
};

type SiteHomeViewProps = {
  data: SitePublicData;
  leadForm?: SiteLeadFormConfig | null;
  previewMode?: boolean;
  previewLabel?: string;
  leadPreviewService?: string;
};

export function SiteHomeView({
  data,
  leadForm,
  previewMode = false,
  previewLabel,
  leadPreviewService,
}: Readonly<SiteHomeViewProps>) {
  const palette = {
    primary: data.settings?.primaryColor || "#b5421f",
    secondary: data.settings?.secondaryColor || "#f4efe9",
    accent: data.settings?.accentColor || "#2b6e52",
  };
  const activeDifferentials = data.home.differentials.filter((item) => item.isActive).slice(0, 4);
  const activeSteps = data.home.howItWorks.filter((item) => item.isActive).slice(0, 3);
  const showcaseItems = [...data.banners, ...data.services]
    .filter((item) => Boolean(item.imageUrl) || ("title" in item && item.title))
    .slice(0, 6);
  const hasShowcaseSection = previewMode || showcaseItems.length > 0;
  const heroMedia = data.home.heroImageUrl || data.banners[0]?.imageUrl || data.services[0]?.imageUrl || "";
  const heroTitle =
    data.settings?.heroTitle ||
    `Sua ideia impressa com agilidade e acabamento profissional`;
  const heroSubtitle =
    data.settings?.heroSubtitle ||
    "Materiais graficos para empresas, eventos e projetos personalizados, com atendimento proximo do orcamento a entrega.";
  const aboutText =
    data.settings?.aboutText ||
    "Transformamos ideias em materiais graficos com orientacao clara de formato, acabamento e prazo.";
  const whatsappHref = buildWhatsappHref(
    data.settings?.contactWhatsapp || "",
    `Ola, gostaria de solicitar um orcamento com a ${data.company.tradeName}.`,
  );

  return (
    <div
      className={styles.page}
      style={
        {
          "--site-primary": palette.primary,
          "--site-secondary": palette.secondary,
          "--site-accent": palette.accent,
        } as CSSProperties
      }
    >
      {previewMode && previewLabel ? (
        <div className={styles.previewBadge}>{previewLabel}</div>
      ) : null}

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <LogoLogo
            tradeName={data.company.tradeName}
            logoUrl={data.settings?.logoUrl || ""}
          />
          <div className={styles.brandText}>
            <span className={styles.brandKicker}>Grafica Platform</span>
            <strong>{data.company.tradeName}</strong>
          </div>
        </div>

        <nav className={styles.navDesktop} aria-label="Navegacao principal do site">
          <a href="#servicos">Servicos</a>
          <a href="#como-funciona">Como funciona</a>
          {hasShowcaseSection ? <a href="#trabalhos">Trabalhos</a> : null}
          <a href="#contato">Contato</a>
        </nav>

        <div className={styles.topbarActions}>
          {data.settings?.contactWhatsapp ? (
            <ActionLink
              label={data.home.whatsappButtonLabel}
              href={whatsappHref}
              previewMode={previewMode}
              variant="ghost"
              target="_blank"
            />
          ) : null}
          <ActionLink
            label={data.home.heroPrimaryCta.label}
            href={resolveCtaHref(data, data.home.heroPrimaryCta)}
            previewMode={previewMode}
            variant="primary"
          />
        </div>

        <details className={styles.mobileMenu}>
          <summary aria-label="Abrir menu do site">Menu</summary>
          <div className={styles.mobileMenuPanel}>
            <a href="#servicos">Servicos</a>
            <a href="#como-funciona">Como funciona</a>
            {hasShowcaseSection ? <a href="#trabalhos">Trabalhos</a> : null}
            <a href="#contato">Contato</a>
            <ActionLink
              label={data.home.heroPrimaryCta.label}
              href={resolveCtaHref(data, data.home.heroPrimaryCta)}
              previewMode={previewMode}
              variant="primary"
            />
          </div>
        </details>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="site-hero-title">
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>{data.home.heroEyebrow}</span>
            <h1 id="site-hero-title" className={styles.heroTitle}>
              {heroTitle}
            </h1>
            <p className={styles.heroSubtitle}>{heroSubtitle}</p>

            <div className={styles.heroActions}>
              <ActionLink
                label={data.home.heroPrimaryCta.label}
                href={resolveCtaHref(data, data.home.heroPrimaryCta)}
                previewMode={previewMode}
                variant="primary"
              />
              <ActionLink
                label={data.home.heroSecondaryCta.label}
                href={resolveCtaHref(data, data.home.heroSecondaryCta)}
                previewMode={previewMode}
                variant="secondary"
              />
            </div>

            <div className={styles.heroMetrics}>
              <Metric label="Servicos ativos" value={String(data.services.length)} />
              <Metric label="Canal principal" value={data.settings?.contactWhatsapp ? "WhatsApp" : "Contato"} />
              <Metric label="Atendimento" value="Personalizado" />
            </div>
          </div>

          <div className={styles.heroMediaArea}>
            <div className={styles.heroMediaCard}>
              <MediaCard
                title={data.banners[0]?.title || "Materiais para valorizar sua marca"}
                subtitle={
                  data.banners[0]?.subtitle ||
                  "Cartoes, adesivos, convites, banners e impressos com apresentacao mais profissional."
                }
                imageUrl={heroMedia}
                imageAlt={
                  data.home.heroImageAlt ||
                  data.banners[0]?.title ||
                  "Materiais graficos em destaque"
                }
              />
            </div>

            <div className={styles.heroInfoCard}>
              <strong>Contato rapido</strong>
              <InfoLine label="WhatsApp" value={formatContactPhone(data.settings?.contactWhatsapp)} />
              <InfoLine label="Telefone" value={formatContactPhone(data.settings?.contactPhone)} />
              <InfoLine label="E-mail" value={data.settings?.contactEmail || "Nao informado"} />
            </div>
          </div>
        </section>

        <section className={styles.aboutPanel} aria-labelledby="site-about-title">
          <div>
            <span className={styles.sectionKicker}>Sobre a grafica</span>
            <h2 id="site-about-title">Atendimento proximo e materiais que ajudam a vender melhor</h2>
          </div>
          <p>{aboutText}</p>
        </section>

        <section className={styles.section} id="diferenciais" aria-labelledby="site-differentials-title">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Diferenciais</span>
            <h2 id="site-differentials-title">{data.home.differentialsTitle}</h2>
          </div>
          <div className={styles.differentialsGrid}>
            {activeDifferentials.map((item) => (
              <DifferentialCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section className={styles.section} id="servicos" aria-labelledby="site-services-title">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Servicos</span>
            <h2 id="site-services-title">{data.home.servicesTitle}</h2>
            <p>Escolha um servico para abrir o pedido de orcamento ja com contexto.</p>
          </div>

          <div className={styles.servicesGrid}>
            {data.services.length === 0 ? (
              <div className={styles.emptyCallout}>
                <strong>Nenhum servico publicado ainda.</strong>
                <p>Ative servicos no painel para transformar esta area em uma vitrine comercial.</p>
              </div>
            ) : (
              data.services.map((service) => {
                const serviceQuoteHref = previewMode
                  ? "#orcamento"
                  : `/${data.company.slug}?servico=${encodeURIComponent(service.title)}#orcamento`;
                const serviceWhatsapp = data.settings?.contactWhatsapp
                  ? buildWhatsappHref(
                      data.settings.contactWhatsapp,
                      `Ola, gostaria de solicitar um orcamento para ${service.title}.`,
                    )
                  : "";

                return (
                  <article key={service.id} className={styles.serviceCard}>
                    <div className={styles.serviceMedia}>
                      <CardImage
                        src={service.imageUrl || data.banners[0]?.imageUrl || ""}
                        alt={service.title}
                        fallbackLabel={service.title}
                      />
                    </div>
                    <div className={styles.serviceBody}>
                      <div className={styles.serviceText}>
                        <strong>{service.title}</strong>
                        <p>
                          {service.shortDescription ||
                            "Material grafico configurado no painel para divulgacao comercial."}
                        </p>
                      </div>
                      <div className={styles.serviceActions}>
                        <ActionLink
                          label="Solicitar orcamento"
                          href={serviceQuoteHref}
                          previewMode={previewMode}
                          variant="primary"
                        />
                        {serviceWhatsapp ? (
                          <ActionLink
                            label="WhatsApp"
                            href={serviceWhatsapp}
                            previewMode={previewMode}
                            variant="ghost"
                            target="_blank"
                          />
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.section} id="como-funciona" aria-labelledby="site-how-title">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Processo</span>
            <h2 id="site-how-title">{data.home.howItWorksTitle}</h2>
          </div>

          <div className={styles.stepsGrid}>
            {activeSteps.map((item, index) => (
              <StepCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </section>

        {hasShowcaseSection ? (
        <section className={styles.section} id="trabalhos" aria-labelledby="site-showcase-title">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Prova visual</span>
            <h2 id="site-showcase-title">{data.home.showcaseTitle}</h2>
          </div>

          {showcaseItems.length === 0 && previewMode ? (
            <div className={styles.emptyCallout}>
              <strong>Adicione imagens reais para valorizar a vitrine.</strong>
              <p>{data.home.showcaseEmptyMessage}</p>
            </div>
          ) : (
            <div className={styles.showcaseGrid}>
              {showcaseItems.map((item, index) => (
                <article
                  key={`${item.id}-${index}`}
                  className={`${styles.showcaseCard} ${index === 0 ? styles.showcaseCardLarge : ""}`}
                >
                  <CardImage
                    src={item.imageUrl || ""}
                    alt={item.title || data.home.heroImageAlt || "Imagem de servico"}
                    fallbackLabel={item.title || "Imagem"}
                  />
                  <div className={styles.showcaseOverlay}>
                    <strong>{item.title || "Imagem em destaque"}</strong>
                    {"subtitle" in item && item.subtitle ? <p>{item.subtitle}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        ) : null}

        <section className={styles.ctaBand} aria-labelledby="site-cta-title">
          <div>
            <span className={styles.sectionKicker}>Orcamento</span>
            <h2 id="site-cta-title">{data.home.finalCtaTitle}</h2>
            <p>{data.home.finalCtaText}</p>
          </div>

          <div className={styles.heroActions}>
            <ActionLink
              label={data.home.finalPrimaryCta.label}
              href={resolveCtaHref(data, data.home.finalPrimaryCta)}
              previewMode={previewMode}
              variant="primary"
            />
            <ActionLink
              label={data.home.finalSecondaryCta.label}
              href={resolveCtaHref(data, data.home.finalSecondaryCta)}
              previewMode={previewMode}
              variant="secondary"
            />
          </div>
        </section>

        <section className={styles.leadSection} id="orcamento" aria-labelledby="site-lead-title">
          <div className={styles.leadSectionMain}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Contato</span>
              <h2 id="site-lead-title">{data.home.contactTitle}</h2>
              <p>Explique o que voce precisa e nossa equipe retorna com a proposta.</p>
            </div>
            {previewMode ? (
              <PreviewLeadPanel
                selectedService={leadPreviewService || data.services[0]?.title || ""}
                showWhatsapp={Boolean(data.settings?.contactWhatsapp)}
              />
            ) : leadForm ? (
              <SiteLeadForm
                companyId={leadForm.companyId}
                companyName={leadForm.companyName}
                initialRequestedService={leadForm.initialRequestedService}
                whatsapp={leadForm.whatsapp}
              />
            ) : null}
          </div>

          <aside className={styles.contactPanel} id="contato" aria-labelledby="site-contact-title">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Contato direto</span>
              <h2 id="site-contact-title">Canais da grafica</h2>
            </div>
            <div className={styles.contactList}>
              <InfoLine label="WhatsApp" value={formatContactPhone(data.settings?.contactWhatsapp)} />
              <InfoLine label="Telefone" value={formatContactPhone(data.settings?.contactPhone)} />
              <InfoLine label="E-mail" value={data.settings?.contactEmail || "Nao informado"} />
              <InfoLine label="Endereco" value={data.settings?.addressFull || "Nao informado"} />
              <InfoLine label="Horario" value={data.home.businessHours || "Consulte os canais de contato para combinar o melhor horario."} />
            </div>
            <div className={styles.contactActions}>
              {data.settings?.contactWhatsapp ? (
                <ActionLink
                  label={data.home.whatsappButtonLabel}
                  href={whatsappHref}
                  previewMode={previewMode}
                  variant="primary"
                  target="_blank"
                />
              ) : null}
              {data.settings?.instagramUrl ? (
                <ActionLink
                  label="Instagram"
                  href={data.settings.instagramUrl}
                  previewMode={previewMode}
                  variant="ghost"
                  target="_blank"
                />
              ) : null}
            </div>
            {data.home.mapEmbedUrl ? (
              previewMode ? (
                <div className={styles.mapPlaceholder}>
                  <strong>Mapa incorporado</strong>
                  <p>Na versao publicada, este bloco exibira o mapa configurado.</p>
                </div>
              ) : (
                <div className={styles.mapFrameWrap}>
                  <iframe
                    className={styles.mapFrame}
                    src={data.home.mapEmbedUrl}
                    title={`Mapa da ${data.company.tradeName}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )
            ) : null}
          </aside>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <LogoLogo
            tradeName={data.company.tradeName}
            logoUrl={data.settings?.logoUrl || ""}
          />
          <div>
            <strong>{data.company.tradeName}</strong>
            <p>Impressos, materiais promocionais e atendimento comercial orientado ao seu projeto.</p>
          </div>
        </div>

        <div className={styles.footerColumns}>
          <div>
            <strong>Links</strong>
            <a href="#servicos">Servicos</a>
            <a href="#como-funciona">Como funciona</a>
            {hasShowcaseSection ? <a href="#trabalhos">Trabalhos</a> : null}
            <a href="#contato">Contato</a>
          </div>
          <div>
            <strong>Servicos</strong>
            {data.services.slice(0, 4).map((service) => (
              <span key={service.id}>{service.title}</span>
            ))}
          </div>
          <div>
            <strong>Contato</strong>
            <span>{formatContactPhone(data.settings?.contactWhatsapp)}</span>
            <span>{data.settings?.contactEmail || "Nao informado"}</span>
            <span>{data.settings?.addressFull || "Nao informado"}</span>
            {data.settings?.instagramUrl ? (
              <a href={data.settings.instagramUrl} target="_blank" rel="noreferrer">
                Instagram
              </a>
            ) : null}
            {data.settings?.facebookUrl ? (
              <a href={data.settings.facebookUrl} target="_blank" rel="noreferrer">
                Facebook
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

function PreviewLeadPanel({
  selectedService,
  showWhatsapp,
}: Readonly<{
  selectedService: string;
  showWhatsapp: boolean;
}>) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 20,
        borderRadius: 24,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(17,24,39,0.08)",
      }}
    >
      <strong>Formulario de contato</strong>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <input value="Nome do cliente" readOnly />
        <input value="(11) 99999-9999" readOnly />
      </div>
      <input value="cliente@empresa.com.br" readOnly />
      <input value={selectedService || "Servico desejado"} readOnly />
      <textarea value="Conte o que voce precisa para receber a proposta." rows={5} readOnly />
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span className={`${styles.actionLink} ${styles.actionLinkPrimary}`}>Solicitar orcamento</span>
        {showWhatsapp ? (
          <span className={`${styles.actionLink} ${styles.actionLinkSecondary}`}>
            Falar pelo WhatsApp
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ActionLink({
  label,
  href,
  previewMode,
  variant,
  target,
}: Readonly<{
  label: string;
  href: string;
  previewMode: boolean;
  variant: "primary" | "secondary" | "ghost";
  target?: string;
}>) {
  const className = [
    styles.actionLink,
    variant === "primary"
      ? styles.actionLinkPrimary
      : variant === "secondary"
        ? styles.actionLinkSecondary
        : styles.actionLinkGhost,
  ].join(" ");

  if (!href && !previewMode) {
    return null;
  }

  if (previewMode) {
    return (
      <span className={className} aria-disabled="true">
        {label}
      </span>
    );
  }

  const external = href.startsWith("http");

  if (external) {
    return (
      <a className={className} href={href} target={target} rel={target === "_blank" ? "noreferrer" : undefined}>
        {label}
      </a>
    );
  }

  if (href.startsWith("#") || href.startsWith("/")) {
    return (
      <Link className={className} href={href} target={target}>
        {label}
      </Link>
    );
  }

  return (
    <a className={className} href={href} target={target} rel={target === "_blank" ? "noreferrer" : undefined}>
      {label}
    </a>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DifferentialCard({ item }: Readonly<{ item: SiteDifferentialItem }>) {
  return (
    <article className={styles.differentialCard}>
      <span className={styles.differentialIcon}>{iconLabel(item.icon)}</span>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
    </article>
  );
}

function StepCard({
  item,
  index,
}: Readonly<{
  item: SiteHowItWorksItem;
  index: number;
}>) {
  return (
    <article className={styles.stepCard}>
      <span className={styles.stepNumber}>{index + 1}</span>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
    </article>
  );
}

function MediaCard({
  title,
  subtitle,
  imageUrl,
  imageAlt,
}: Readonly<{
  title: string;
  subtitle: string;
  imageUrl: string | null;
  imageAlt: string;
}>) {
  return (
    <div className={styles.mediaCard}>
      <CardImage src={imageUrl || ""} alt={imageAlt} fallbackLabel={title} />
      <div className={styles.mediaCardText}>
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function CardImage({
  src,
  alt,
  fallbackLabel,
}: Readonly<{
  src: string;
  alt: string;
  fallbackLabel: string;
}>) {
  if (!src) {
    return (
      <div className={styles.imageFallback}>
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <div className={styles.imageWrap}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );
}

function LogoLogo({
  tradeName,
  logoUrl,
}: Readonly<{
  tradeName: string;
  logoUrl: string;
}>) {
  if (logoUrl) {
    return (
      <div className={styles.logoWrap}>
        <Image src={logoUrl} alt={tradeName} fill sizes="64px" />
      </div>
    );
  }

  return (
    <div className={styles.logoFallback} aria-hidden="true">
      {tradeName.slice(0, 2).toUpperCase()}
    </div>
  );
}

function InfoLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className={styles.infoLine}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function resolveCtaHref(data: SitePublicData, cta: SiteCtaConfig) {
  switch (cta.action) {
    case "WHATSAPP":
      return buildWhatsappHref(
        data.settings?.contactWhatsapp || "",
        `Ola, gostaria de falar com a ${data.company.tradeName}.`,
      );
    case "SERVICES":
      return "#servicos";
    case "CONTACT":
      return "#contato";
    case "CUSTOM":
      return cta.href || "#orcamento";
    case "QUOTE_FORM":
    default:
      return "#orcamento";
  }
}

function buildWhatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function formatContactPhone(value?: string | null) {
  if (!value) {
    return "Nao informado";
  }

  return formatPhone(value);
}

function iconLabel(icon: SiteDifferentialItem["icon"]) {
  switch (icon) {
    case "speed":
      return "AG";
    case "layers":
      return "CM";
    case "materials":
      return "MP";
    case "support":
      return "WA";
    default:
      return "GP";
  }
}
