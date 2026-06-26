"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  Field,
  FormSection,
  LoadingButton,
  MetricCard,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusBadge,
  Tabs,
} from "@/components/admin/ui";
import { SiteHomeView } from "@/components/site/site-home-view";
import {
  composeDraftSitePublicData,
  createDefaultSiteHomeContent,
  getSiteMetaDescription,
  getSiteMetaTitle,
  parsePublishedSiteSnapshot,
  parseSiteHomeContent,
  type SiteHomeContent,
} from "@/lib/site/site-home";
import {
  formatPhone,
  isValidEmail,
  isValidPhone,
  normalizeEmailInput,
} from "@/lib/forms/br-utils";

type SiteSettingsState = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  instagramUrl: string;
  facebookUrl: string;
  addressFull: string;
  isSitePublished: boolean;
};

type ServiceFormState = {
  title: string;
  shortDescription: string;
  imageUrl: string;
};

type BannerFormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaLink: string;
};

type SitePageRecord = {
  id: string;
  pageKey: string;
  slug: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  contentJson?: string | null;
  isPublished: boolean;
  updatedAt?: string;
};

type SiteAdminData = {
  id: string;
  tradeName: string;
  slug: string;
  siteSettings: (SiteSettingsState & { id: string | null }) | null;
  siteServices: Array<{
    id: string;
    title: string;
    shortDescription?: string | null;
    imageUrl?: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
  siteBanners: Array<{
    id: string;
    title?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaLink?: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
  sitePages?: SitePageRecord[];
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type StepId = "identity" | "home" | "services" | "contact" | "review";
type PreviewViewport = "desktop" | "mobile";

const defaultSettings: SiteSettingsState = {
  primaryColor: "#b5421f",
  secondaryColor: "#f5ede3",
  accentColor: "#2b6e52",
  logoUrl: "",
  faviconUrl: "",
  heroTitle: "",
  heroSubtitle: "",
  aboutText: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  instagramUrl: "",
  facebookUrl: "",
  addressFull: "",
  isSitePublished: false,
};

const defaultServiceForm: ServiceFormState = {
  title: "",
  shortDescription: "",
  imageUrl: "",
};

const defaultBannerForm: BannerFormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaLabel: "",
  ctaLink: "",
};

const guidedSteps: Array<{ id: StepId; label: string }> = [
  { id: "identity", label: "1. Identidade" },
  { id: "home", label: "2. Pagina inicial" },
  { id: "services", label: "3. Servicos" },
  { id: "contact", label: "4. Contato" },
  { id: "review", label: "5. Revisar e publicar" },
];

export default function SiteAdminPage() {
  const [site, setSite] = useState<SiteAdminData | null>(null);
  const [settings, setSettings] = useState<SiteSettingsState>(defaultSettings);
  const [homeContent, setHomeContent] = useState<SiteHomeContent>(createDefaultSiteHomeContent());
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(defaultServiceForm);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(defaultBannerForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("identity");
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSite() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/site/settings", {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as ApiResult<SiteAdminData>;

        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Nao foi possivel carregar a configuracao do site.");
          return;
        }

        setSite(result.data);
        setSettings(result.data.siteSettings ? mapSettings(result.data.siteSettings) : defaultSettings);
        setHomeContent(resolveHomeDraftContent(result.data));
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setErrorMessage("Falha ao carregar a configuracao do site.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSite();

    return () => controller.abort();
  }, []);

  const activeServiceCount = site?.siteServices.filter((service) => service.isActive).length ?? 0;
  const activeBannerCount = site?.siteBanners.filter((banner) => banner.isActive).length ?? 0;
  const previewPalette = useMemo(
    () => ({
      primaryColor: settings.primaryColor || defaultSettings.primaryColor,
      secondaryColor: settings.secondaryColor || defaultSettings.secondaryColor,
      accentColor: settings.accentColor || defaultSettings.accentColor,
    }),
    [settings.accentColor, settings.primaryColor, settings.secondaryColor],
  );

  const draftPreview = useMemo(
    () =>
      site
        ? composeDraftSitePublicData({
            company: {
              id: site.id,
              tradeName: site.tradeName,
              slug: site.slug,
            },
            settings,
            services: site.siteServices,
            banners: site.siteBanners,
            homeContent,
            isPublished: Boolean(site.siteSettings?.isSitePublished),
          })
        : null,
    [homeContent, settings, site],
  );

  const publishedSnapshot = useMemo(
    () => parsePublishedSiteSnapshot(resolvePublishedPage(site)?.contentJson),
    [site],
  );

  const hasUnpublishedChanges = useMemo(() => {
    if (!draftPreview) {
      return false;
    }

    if (!settings.isSitePublished || !publishedSnapshot) {
      return true;
    }

    return comparableSnapshot(draftPreview) !== comparableSnapshot(publishedSnapshot);
  }, [draftPreview, publishedSnapshot, settings.isSitePublished]);

  const stepChecklist = useMemo(
    () => [
      {
        id: "identity" as StepId,
        label: "Identidade pronta",
        ready: Boolean(settings.logoUrl.trim()) || Boolean(settings.faviconUrl.trim()),
        help: "Adicione pelo menos o logotipo ou o favicon para diferenciar a marca.",
      },
      {
        id: "home" as StepId,
        label: "Pagina inicial preenchida",
        ready: Boolean(settings.heroTitle.trim()) && Boolean(settings.heroSubtitle.trim()),
        help: "Defina titulo, subtitulo e CTAs para orientar a primeira dobra.",
      },
      {
        id: "services" as StepId,
        label: "Servicos ativos",
        ready: activeServiceCount > 0,
        help: "Publique pelo menos um servico para a home ganhar apelo comercial.",
      },
      {
        id: "contact" as StepId,
        label: "Contato configurado",
        ready:
          Boolean(settings.contactEmail.trim()) ||
          Boolean(settings.contactPhone.trim()) ||
          Boolean(settings.contactWhatsapp.trim()),
        help: "Deixe pelo menos um canal de atendimento pronto antes de publicar.",
      },
      {
        id: "review" as StepId,
        label: "Publicacao consistente",
        ready: settings.isSitePublished && !hasUnpublishedChanges,
        help: hasUnpublishedChanges
          ? "Existem alteracoes salvas que ainda nao foram publicadas."
          : "O site publicado ja reflete a versao revisada desta home.",
      },
    ],
    [
      activeServiceCount,
      hasUnpublishedChanges,
      settings.contactEmail,
      settings.contactPhone,
      settings.contactWhatsapp,
      settings.faviconUrl,
      settings.heroSubtitle,
      settings.heroTitle,
      settings.isSitePublished,
      settings.logoUrl,
    ],
  );

  const previousStep = getNeighborStep(activeStep, -1);
  const nextStep = getNeighborStep(activeStep, 1);

  function updateSettingsField<K extends keyof SiteSettingsState>(field: K, value: SiteSettingsState[K]) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateHomeField<K extends keyof SiteHomeContent>(field: K, value: SiteHomeContent[K]) {
    setHomeContent((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateHomeCta(
    field: "heroPrimaryCta" | "heroSecondaryCta" | "finalPrimaryCta" | "finalSecondaryCta",
    nextValue: Partial<SiteHomeContent[typeof field]>,
  ) {
    setHomeContent((current) => ({
      ...current,
      [field]: {
        ...current[field],
        ...nextValue,
      },
    }));
  }

  function updateHomeDifferential(
    index: number,
    patch: Partial<SiteHomeContent["differentials"][number]>,
  ) {
    setHomeContent((current) => ({
      ...current,
      differentials: current.differentials.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));
  }

  function updateHowItWorks(
    index: number,
    patch: Partial<SiteHomeContent["howItWorks"][number]>,
  ) {
    setHomeContent((current) => ({
      ...current,
      howItWorks: current.howItWorks.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));
  }

  function updateServiceField<K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) {
    setServiceForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBannerField<K extends keyof BannerFormState>(field: K, value: BannerFormState[K]) {
    setBannerForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateSettingsForm() {
    if (settings.contactEmail && !isValidEmail(settings.contactEmail)) {
      return "Informe um e-mail comercial valido.";
    }

    if (settings.contactPhone && !isValidPhone(settings.contactPhone)) {
      return "Informe um telefone comercial valido com DDD.";
    }

    if (settings.contactWhatsapp && !isValidPhone(settings.contactWhatsapp)) {
      return "Informe um WhatsApp comercial valido com DDD.";
    }

    return null;
  }

  function startServiceEdit(service: SiteAdminData["siteServices"][number]) {
    setEditingServiceId(service.id);
    setServiceForm({
      title: service.title,
      shortDescription: service.shortDescription ?? "",
      imageUrl: service.imageUrl ?? "",
    });
    setActiveStep("services");
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function cancelServiceEdit() {
    setEditingServiceId(null);
    setServiceForm(defaultServiceForm);
  }

  function startBannerEdit(banner: SiteAdminData["siteBanners"][number]) {
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      imageUrl: banner.imageUrl ?? "",
      ctaLabel: banner.ctaLabel ?? "",
      ctaLink: banner.ctaLink ?? "",
    });
    setActiveStep("services");
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function cancelBannerEdit() {
    setEditingBannerId(null);
    setBannerForm(defaultBannerForm);
  }

  async function refreshSite() {
    const response = await fetch("/api/site/settings", {
      cache: "no-store",
    });
    const result = (await response.json()) as ApiResult<SiteAdminData>;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message ?? "Nao foi possivel recarregar o site.");
    }

    setSite(result.data);
    setSettings(result.data.siteSettings ? mapSettings(result.data.siteSettings) : defaultSettings);
    setHomeContent(resolveHomeDraftContent(result.data));
  }

  async function saveSettings(publicationAction: "saveDraft" | "publish") {
    if (!site) return;

    const validationMessage = validateSettingsForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingSettings(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/site/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: site.id,
          ...settings,
          contactEmail: settings.contactEmail ? normalizeEmailInput(settings.contactEmail) : "",
          homeContent,
          publicationAction,
        }),
      });

      const result = (await response.json()) as ApiResult<{ saved: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar a configuracao do site.");
        return;
      }

      await refreshSite();
      setSuccessMessage(
        publicationAction === "publish"
          ? "Website publicado com sucesso."
          : "Rascunho do website salvo com sucesso.",
      );
    } catch {
      setErrorMessage("Falha ao salvar a configuracao do site.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleSaveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSettings("saveDraft");
  }

  async function handleCreateService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site) return;

    setIsCreatingService(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingServiceId);
      const response = await fetch(
        isEditing ? `/api/site/services/${editingServiceId}` : "/api/site/services",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId: site.id,
            ...serviceForm,
            sortOrder: isEditing
              ? site.siteServices.find((service) => service.id === editingServiceId)?.sortOrder ?? 0
              : site.siteServices.length,
            ...(isEditing
              ? {
                  isActive:
                    site.siteServices.find((service) => service.id === editingServiceId)?.isActive ?? true,
                }
              : {}),
          }),
        },
      );

      const result = (await response.json()) as ApiResult<{ created?: true; updated?: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel adicionar o servico.");
        return;
      }

      setServiceForm(defaultServiceForm);
      setEditingServiceId(null);
      await refreshSite();
      setSuccessMessage(isEditing ? "Servico atualizado com sucesso." : "Servico adicionado ao site.");
    } catch {
      setErrorMessage("Falha ao adicionar o servico.");
    } finally {
      setIsCreatingService(false);
    }
  }

  async function handleCreateBanner(event?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    if (!site) return;

    setIsCreatingBanner(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingBannerId);
      const response = await fetch(
        isEditing ? `/api/site/banners/${editingBannerId}` : "/api/site/banners",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId: site.id,
            ...bannerForm,
            sortOrder: isEditing
              ? site.siteBanners.find((banner) => banner.id === editingBannerId)?.sortOrder ?? 0
              : site.siteBanners.length,
            ...(isEditing
              ? {
                  isActive:
                    site.siteBanners.find((banner) => banner.id === editingBannerId)?.isActive ?? true,
                }
              : {}),
          }),
        },
      );

      const result = (await response.json()) as ApiResult<{ created?: true; updated?: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel adicionar a imagem em destaque.");
        return;
      }

      setBannerForm(defaultBannerForm);
      setEditingBannerId(null);
      await refreshSite();
      setSuccessMessage(isEditing ? "Imagem atualizada com sucesso." : "Imagem adicionada a vitrine.");
    } catch {
      setErrorMessage("Falha ao adicionar a imagem em destaque.");
    } finally {
      setIsCreatingBanner(false);
    }
  }

  async function handleToggleService(serviceId: string, isActive: boolean) {
    if (!site) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const current = site.siteServices.find((service) => service.id === serviceId);

      if (!current) {
        return;
      }

      const response = await fetch(`/api/site/services/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: site.id,
          title: current.title,
          shortDescription: current.shortDescription ?? "",
          imageUrl: current.imageUrl ?? "",
          sortOrder: current.sortOrder,
          isActive: !isActive,
        }),
      });

      const result = (await response.json()) as ApiResult<{ updated: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o servico.");
        return;
      }

      await refreshSite();
      setSuccessMessage(!isActive ? "Servico reativado com sucesso." : "Servico retirado da home.");
    } catch {
      setErrorMessage("Falha ao atualizar o servico.");
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!site || !window.confirm("Deseja excluir este servico da vitrine?")) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/site/services/${serviceId}?companyId=${site.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResult<{ deleted: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel excluir o servico.");
        return;
      }

      if (editingServiceId === serviceId) {
        cancelServiceEdit();
      }

      await refreshSite();
      setSuccessMessage("Servico excluido com sucesso.");
    } catch {
      setErrorMessage("Falha ao excluir o servico.");
    }
  }

  async function handleToggleBanner(bannerId: string, isActive: boolean) {
    if (!site) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const current = site.siteBanners.find((banner) => banner.id === bannerId);

      if (!current) {
        return;
      }

      const response = await fetch(`/api/site/banners/${bannerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: site.id,
          title: current.title ?? "",
          subtitle: current.subtitle ?? "",
          imageUrl: current.imageUrl ?? "",
          ctaLabel: current.ctaLabel ?? "",
          ctaLink: current.ctaLink ?? "",
          sortOrder: current.sortOrder,
          isActive: !isActive,
        }),
      });

      const result = (await response.json()) as ApiResult<{ updated: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel atualizar a imagem.");
        return;
      }

      await refreshSite();
      setSuccessMessage(!isActive ? "Imagem reativada com sucesso." : "Imagem retirada da home.");
    } catch {
      setErrorMessage("Falha ao atualizar a imagem em destaque.");
    }
  }

  async function handleDeleteBanner(bannerId: string) {
    if (!site || !window.confirm("Deseja excluir esta imagem em destaque?")) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/site/banners/${bannerId}?companyId=${site.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResult<{ deleted: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel excluir a imagem.");
        return;
      }

      if (editingBannerId === bannerId) {
        cancelBannerEdit();
      }

      await refreshSite();
      setSuccessMessage("Imagem excluida com sucesso.");
    } catch {
      setErrorMessage("Falha ao excluir a imagem em destaque.");
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Website" }, { label: "Visao geral" }]}
        title="Website comercial"
        description="Monte a home publica, revise a comunicacao e publique somente quando a versao estiver pronta para conversao."
        secondaryActions={
          site?.slug && settings.isSitePublished
            ? [{ href: `/${site.slug}`, label: "Abrir site publicado", variant: "secondary", target: "_blank" }]
            : []
        }
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel concluir a operacao">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {isLoading || !site || !draftPreview ? (
        <SectionCard title="Carregando configuracoes do site">
          <Skeleton lines={10} />
        </SectionCard>
      ) : (
        <>
          <div className="admin-card-grid">
            <MetricCard
              label="Status publico"
              value={settings.isSitePublished ? "Publicado" : "Rascunho"}
              description={settings.isSitePublished ? "Existe uma versao publica ativa." : "O site ainda nao foi publicado."}
            />
            <MetricCard label="Slug publico" value={`/${site.slug}`} description="Endereco principal do website." />
            <MetricCard label="Servicos ativos" value={String(activeServiceCount)} description="Servicos prontos para vitrine." />
            <MetricCard
              label="Alteracoes pendentes"
              value={hasUnpublishedChanges ? "Sim" : "Nao"}
              description={hasUnpublishedChanges ? "Rascunho diferente da versao publicada." : "Rascunho alinhado com o publicado."}
            />
          </div>

          <div className="admin-layout-grid admin-layout-grid--sidebar">
            <div className="admin-page-stack">
              <SectionCard
                title="Configuracao guiada"
                description="Ajuste o conteudo comercial sem transformar o painel em um editor complexo."
                actions={
                  <Tabs
                    tabs={guidedSteps}
                    activeTab={activeStep}
                    onChange={(value) => setActiveStep(value as StepId)}
                  />
                }
              >
                <form className="admin-page-stack" onSubmit={handleSaveDraft}>
                  {activeStep === "identity" ? (
                    <>
                      <Alert variant="info">
                        Defina as cores e os ativos visuais da marca. Essa base vai alimentar o site publicado e a previa interna.
                      </Alert>

                      <div className="admin-form-grid admin-form-grid--3">
                        <Field label="Cor principal" required helpText="Usada em botoes, CTAs e destaques principais.">
                          <input
                            type="color"
                            value={settings.primaryColor}
                            onChange={(event) => updateSettingsField("primaryColor", event.target.value)}
                            className="admin-input"
                            style={{ padding: 6 }}
                          />
                        </Field>
                        <Field label="Cor secundaria" required helpText="Base suave de papeis, fundos e apoios visuais.">
                          <input
                            type="color"
                            value={settings.secondaryColor}
                            onChange={(event) => updateSettingsField("secondaryColor", event.target.value)}
                            className="admin-input"
                            style={{ padding: 6 }}
                          />
                        </Field>
                        <Field label="Cor de destaque" required helpText="Acento para pequenos detalhes e contraste.">
                          <input
                            type="color"
                            value={settings.accentColor}
                            onChange={(event) => updateSettingsField("accentColor", event.target.value)}
                            className="admin-input"
                            style={{ padding: 6 }}
                          />
                        </Field>
                      </div>

                      <div className="admin-form-grid admin-form-grid--2">
                        <Field label="Logotipo" optional helpText="Cole a URL da marca principal.">
                          <input
                            className="admin-input"
                            value={settings.logoUrl}
                            onChange={(event) => updateSettingsField("logoUrl", event.target.value)}
                            placeholder="https://..."
                          />
                        </Field>
                        <Field label="Favicon" optional helpText="Icone usado na aba do navegador e compartilhamento.">
                          <input
                            className="admin-input"
                            value={settings.faviconUrl}
                            onChange={(event) => updateSettingsField("faviconUrl", event.target.value)}
                            placeholder="https://..."
                          />
                        </Field>
                      </div>
                    </>
                  ) : null}

                  {activeStep === "home" ? (
                    <>
                      <Alert variant="info">
                        Monte a proposta principal do website com texto curto, CTAs claros, diferenciais e a explicacao do processo comercial.
                      </Alert>

                      <div className="admin-form-grid admin-form-grid--2">
                        <Field label="Titulo do hero" required>
                          <input
                            className="admin-input"
                            value={settings.heroTitle}
                            onChange={(event) => updateSettingsField("heroTitle", event.target.value)}
                            placeholder="Sua ideia impressa com qualidade e agilidade"
                          />
                        </Field>
                        <Field label="Subtitulo do hero" required>
                          <textarea
                            className="admin-textarea"
                            value={settings.heroSubtitle}
                            onChange={(event) => updateSettingsField("heroSubtitle", event.target.value)}
                            placeholder="Materiais graficos para empresas, eventos e projetos personalizados."
                          />
                        </Field>
                      </div>

                      <div className="admin-form-grid admin-form-grid--2">
                        <Field label="Etiqueta acima do hero" optional>
                          <input
                            className="admin-input"
                            value={homeContent.heroEyebrow}
                            onChange={(event) => updateHomeField("heroEyebrow", event.target.value)}
                            placeholder="Impressao criativa com atendimento proximo"
                          />
                        </Field>
                        <Field label="Imagem principal" optional helpText="Pode ser mockup, foto de produto ou composicao real.">
                          <input
                            className="admin-input"
                            value={homeContent.heroImageUrl}
                            onChange={(event) => updateHomeField("heroImageUrl", event.target.value)}
                            placeholder="https://..."
                          />
                        </Field>
                      </div>

                      <Field label="Texto institucional" optional>
                        <textarea
                          className="admin-textarea"
                          value={settings.aboutText}
                          onChange={(event) => updateSettingsField("aboutText", event.target.value)}
                          placeholder="Conte rapidamente quem e a grafica, como atende e em que se destaca."
                        />
                      </Field>

                      <FormSection
                        title="Chamadas principais"
                        description="Configure os textos dos CTAs do hero e da faixa final."
                        defaultOpen
                      >
                        <div className="admin-form-grid admin-form-grid--2">
                          <Field label="Botao principal do hero" required>
                            <input
                              className="admin-input"
                              value={homeContent.heroPrimaryCta.label}
                              onChange={(event) =>
                                updateHomeCta("heroPrimaryCta", { label: event.target.value })
                              }
                              placeholder="Pedir orcamento"
                            />
                          </Field>
                          <Field label="Acao do botao principal" required>
                            <select
                              className="admin-input"
                              value={homeContent.heroPrimaryCta.action}
                              onChange={(event) =>
                                updateHomeCta("heroPrimaryCta", {
                                  action: event.target.value as SiteHomeContent["heroPrimaryCta"]["action"],
                                })
                              }
                            >
                              <option value="QUOTE_FORM">Abrir formulario</option>
                              <option value="WHATSAPP">Abrir WhatsApp</option>
                              <option value="SERVICES">Ir para servicos</option>
                              <option value="CONTACT">Ir para contato</option>
                              <option value="CUSTOM">Link personalizado</option>
                            </select>
                          </Field>
                          <Field label="Botao secundario do hero" required>
                            <input
                              className="admin-input"
                              value={homeContent.heroSecondaryCta.label}
                              onChange={(event) =>
                                updateHomeCta("heroSecondaryCta", { label: event.target.value })
                              }
                              placeholder="Conhecer servicos"
                            />
                          </Field>
                          <Field label="Acao do botao secundario" required>
                            <select
                              className="admin-input"
                              value={homeContent.heroSecondaryCta.action}
                              onChange={(event) =>
                                updateHomeCta("heroSecondaryCta", {
                                  action: event.target.value as SiteHomeContent["heroSecondaryCta"]["action"],
                                })
                              }
                            >
                              <option value="SERVICES">Ir para servicos</option>
                              <option value="QUOTE_FORM">Abrir formulario</option>
                              <option value="WHATSAPP">Abrir WhatsApp</option>
                              <option value="CONTACT">Ir para contato</option>
                              <option value="CUSTOM">Link personalizado</option>
                            </select>
                          </Field>
                          <Field label="Titulo da faixa final" required>
                            <input
                              className="admin-input"
                              value={homeContent.finalCtaTitle}
                              onChange={(event) => updateHomeField("finalCtaTitle", event.target.value)}
                              placeholder="Tem um projeto em mente?"
                            />
                          </Field>
                          <Field label="Texto da faixa final" required>
                            <textarea
                              className="admin-textarea"
                              value={homeContent.finalCtaText}
                              onChange={(event) => updateHomeField("finalCtaText", event.target.value)}
                              placeholder="Fale com a equipe e receba uma proposta personalizada."
                            />
                          </Field>
                        </div>
                      </FormSection>

                      <FormSection
                        title="Diferenciais"
                        description="Use mensagens curtas e verdadeiras sobre a operacao da grafica."
                        defaultOpen
                      >
                        <Field label="Titulo da secao" required>
                          <input
                            className="admin-input"
                            value={homeContent.differentialsTitle}
                            onChange={(event) => updateHomeField("differentialsTitle", event.target.value)}
                          />
                        </Field>
                        <div className="admin-list-stack">
                          {homeContent.differentials.map((item, index) => (
                            <article key={`${item.title}-${index}`} className="admin-list-card">
                              <div className="admin-form-grid admin-form-grid--2">
                                <Field label={`Titulo ${index + 1}`} required>
                                  <input
                                    className="admin-input"
                                    value={item.title}
                                    onChange={(event) =>
                                      updateHomeDifferential(index, { title: event.target.value })
                                    }
                                  />
                                </Field>
                                <Field label="Icone">
                                  <select
                                    className="admin-input"
                                    value={item.icon}
                                    onChange={(event) =>
                                      updateHomeDifferential(index, {
                                        icon: event.target.value as SiteHomeContent["differentials"][number]["icon"],
                                      })
                                    }
                                  >
                                    <option value="speed">Rapidez</option>
                                    <option value="layers">Camadas</option>
                                    <option value="materials">Materiais</option>
                                    <option value="support">Suporte</option>
                                  </select>
                                </Field>
                              </div>
                              <Field label="Descricao" required>
                                <textarea
                                  className="admin-textarea"
                                  value={item.description}
                                  onChange={(event) =>
                                    updateHomeDifferential(index, { description: event.target.value })
                                  }
                                />
                              </Field>
                              <label className="admin-checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={item.isActive}
                                  onChange={(event) =>
                                    updateHomeDifferential(index, { isActive: event.target.checked })
                                  }
                                />
                                <span>Mostrar este diferencial na home</span>
                              </label>
                            </article>
                          ))}
                        </div>
                      </FormSection>

                      <FormSection
                        title="Como funciona"
                        description="Explique o caminho do cliente ate o orcamento e a producao."
                        defaultOpen
                      >
                        <Field label="Titulo da secao" required>
                          <input
                            className="admin-input"
                            value={homeContent.howItWorksTitle}
                            onChange={(event) => updateHomeField("howItWorksTitle", event.target.value)}
                          />
                        </Field>
                        <div className="admin-list-stack">
                          {homeContent.howItWorks.map((item, index) => (
                            <article key={`${item.title}-${index}`} className="admin-list-card">
                              <Field label={`Passo ${index + 1}`} required>
                                <input
                                  className="admin-input"
                                  value={item.title}
                                  onChange={(event) =>
                                    updateHowItWorks(index, { title: event.target.value })
                                  }
                                />
                              </Field>
                              <Field label="Descricao" required>
                                <textarea
                                  className="admin-textarea"
                                  value={item.description}
                                  onChange={(event) =>
                                    updateHowItWorks(index, { description: event.target.value })
                                  }
                                />
                              </Field>
                            </article>
                          ))}
                        </div>
                      </FormSection>
                    </>
                  ) : null}

                  {activeStep === "services" ? (
                    <div className="admin-page-stack">
                      <form className="admin-page-stack" onSubmit={handleCreateService}>
                        {editingServiceId ? (
                          <Alert variant="info" title="Edicao de servico ativa">
                            Ajuste os dados abaixo ou cancele para voltar ao cadastro de um novo servico.
                          </Alert>
                        ) : null}

                        <div className="admin-form-grid admin-form-grid--2">
                          <Field label="Nome do servico" required>
                            <input
                              className="admin-input"
                              value={serviceForm.title}
                              onChange={(event) => updateServiceField("title", event.target.value)}
                              placeholder="Cartoes, banners e adesivos"
                            />
                          </Field>

                          <Field label="Imagem do servico" optional>
                            <input
                              className="admin-input"
                              value={serviceForm.imageUrl}
                              onChange={(event) => updateServiceField("imageUrl", event.target.value)}
                              placeholder="https://..."
                            />
                          </Field>
                        </div>

                        <Field label="Descricao curta" optional>
                          <textarea
                            className="admin-textarea"
                            value={serviceForm.shortDescription}
                            onChange={(event) => updateServiceField("shortDescription", event.target.value)}
                            placeholder="Resumo comercial do servico."
                          />
                        </Field>

                        <div className="admin-row admin-row--between">
                          <div className="admin-row">
                            {editingServiceId ? (
                              <button type="button" className="admin-button admin-button--ghost" onClick={cancelServiceEdit}>
                                Cancelar edicao
                              </button>
                            ) : null}
                          </div>
                          <LoadingButton type="submit" isLoading={isCreatingService}>
                            {editingServiceId ? "Salvar servico" : "Adicionar servico"}
                          </LoadingButton>
                        </div>
                      </form>

                      <SectionCard title="Servicos da home" description="Ative somente o que fizer sentido comercialmente.">
                        <div className="admin-list-stack">
                          {site.siteServices.length === 0 ? (
                            <EmptyState
                              title="Nenhum servico cadastrado"
                              description="Adicione o primeiro servico para montar a vitrine comercial."
                            />
                          ) : (
                            site.siteServices.map((service) => (
                              <article key={service.id} className="admin-list-card">
                                <div className="admin-row admin-row--between">
                                  <strong>{service.title}</strong>
                                  <StatusBadge
                                    status={service.isActive ? "Ativo" : "Inativo"}
                                    tone={service.isActive ? "success" : "neutral"}
                                  />
                                </div>
                                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                                  {service.shortDescription || "Sem descricao resumida."}
                                </p>
                                <div className="admin-row">
                                  <button type="button" className="admin-button admin-button--secondary" onClick={() => startServiceEdit(service)}>
                                    Editar
                                  </button>
                                  <button type="button" className="admin-button admin-button--ghost" onClick={() => handleToggleService(service.id, service.isActive)}>
                                    {service.isActive ? "Inativar" : "Reativar"}
                                  </button>
                                  <button type="button" className="admin-button admin-button--danger" onClick={() => handleDeleteService(service.id)}>
                                    Excluir
                                  </button>
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </SectionCard>

                      <FormSection
                        title="Trabalhos em destaque"
                        description="Use estas imagens para reforcar campanhas, mockups e prova visual do site."
                        defaultOpen
                      >
                        {editingBannerId ? (
                          <Alert variant="info" title="Edicao de imagem ativa">
                            Ajuste esta imagem ou cancele para voltar ao cadastro de uma nova vitrine.
                          </Alert>
                        ) : null}

                        <div className="admin-form-grid admin-form-grid--2">
                          <Field label="Titulo visual" optional>
                            <input
                              className="admin-input"
                              value={bannerForm.title}
                              onChange={(event) => updateBannerField("title", event.target.value)}
                              placeholder="Entrega rapida para sua campanha"
                            />
                          </Field>
                          <Field label="Imagem" optional>
                            <input
                              className="admin-input"
                              value={bannerForm.imageUrl}
                              onChange={(event) => updateBannerField("imageUrl", event.target.value)}
                              placeholder="https://..."
                            />
                          </Field>
                        </div>

                        <Field label="Texto de apoio" optional>
                          <textarea
                            className="admin-textarea"
                            value={bannerForm.subtitle}
                            onChange={(event) => updateBannerField("subtitle", event.target.value)}
                            placeholder="Mensagem curta para acompanhar a imagem."
                          />
                        </Field>

                        <div className="admin-form-grid admin-form-grid--2">
                          <Field label="Texto do botao" optional>
                            <input
                              className="admin-input"
                              value={bannerForm.ctaLabel}
                              onChange={(event) => updateBannerField("ctaLabel", event.target.value)}
                              placeholder="Pedir orcamento"
                            />
                          </Field>
                          <Field label="Link do botao" optional>
                            <input
                              className="admin-input"
                              value={bannerForm.ctaLink}
                              onChange={(event) => updateBannerField("ctaLink", event.target.value)}
                              placeholder="https://wa.me/..."
                            />
                          </Field>
                        </div>

                        <div className="admin-row admin-row--between">
                          <div className="admin-row">
                            {editingBannerId ? (
                              <button type="button" className="admin-button admin-button--ghost" onClick={cancelBannerEdit}>
                                Cancelar edicao
                              </button>
                            ) : null}
                          </div>
                          <LoadingButton type="button" isLoading={isCreatingBanner} onClick={handleCreateBanner}>
                            {editingBannerId ? "Salvar imagem" : "Adicionar imagem"}
                          </LoadingButton>
                        </div>

                        <div className="admin-list-stack">
                          {site.siteBanners.length === 0 ? (
                            <EmptyState
                              title="Nenhuma imagem de destaque"
                              description="Adicione imagens reais para deixar o site mais vivo."
                            />
                          ) : (
                            site.siteBanners.map((banner) => (
                              <article key={banner.id} className="admin-list-card">
                                <div className="admin-row admin-row--between">
                                  <strong>{banner.title || "Imagem sem titulo"}</strong>
                                  <StatusBadge
                                    status={banner.isActive ? "Ativa" : "Inativa"}
                                    tone={banner.isActive ? "success" : "neutral"}
                                  />
                                </div>
                                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                                  {banner.subtitle || "Sem texto de apoio."}
                                </p>
                                <div className="admin-row">
                                  <button type="button" className="admin-button admin-button--secondary" onClick={() => startBannerEdit(banner)}>
                                    Editar
                                  </button>
                                  <button type="button" className="admin-button admin-button--ghost" onClick={() => handleToggleBanner(banner.id, banner.isActive)}>
                                    {banner.isActive ? "Inativar" : "Reativar"}
                                  </button>
                                  <button type="button" className="admin-button admin-button--danger" onClick={() => handleDeleteBanner(banner.id)}>
                                    Excluir
                                  </button>
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </FormSection>
                    </div>
                  ) : null}

                  {activeStep === "contact" ? (
                    <>
                      <Alert variant="info">
                        Destaque canais reais de atendimento. O site comercial precisa facilitar o proximo passo do cliente.
                      </Alert>

                      <div className="admin-form-grid admin-form-grid--2">
                        <Field label="E-mail comercial" optional>
                          <input
                            className="admin-input"
                            value={settings.contactEmail}
                            onChange={(event) =>
                              updateSettingsField("contactEmail", normalizeEmailInput(event.target.value))
                            }
                            placeholder="contato@grafica.com.br"
                          />
                        </Field>

                        <Field label="Telefone" optional>
                          <input
                            className="admin-input"
                            value={settings.contactPhone}
                            onChange={(event) => updateSettingsField("contactPhone", formatPhone(event.target.value))}
                            inputMode="tel"
                            maxLength={15}
                            placeholder="(11) 0000-0000"
                          />
                        </Field>

                        <Field label="WhatsApp" optional>
                          <input
                            className="admin-input"
                            value={settings.contactWhatsapp}
                            onChange={(event) => updateSettingsField("contactWhatsapp", formatPhone(event.target.value))}
                            inputMode="tel"
                            maxLength={15}
                            placeholder="(11) 99999-9999"
                          />
                        </Field>

                        <Field label="Texto do botao de WhatsApp" optional>
                          <input
                            className="admin-input"
                            value={homeContent.whatsappButtonLabel}
                            onChange={(event) => updateHomeField("whatsappButtonLabel", event.target.value)}
                            placeholder="Falar pelo WhatsApp"
                          />
                        </Field>

                        <Field label="Endereco completo" optional>
                          <input
                            className="admin-input"
                            value={settings.addressFull}
                            onChange={(event) => updateSettingsField("addressFull", event.target.value)}
                            placeholder="Rua, numero, bairro, cidade"
                          />
                        </Field>

                        <Field label="Horario de atendimento" optional>
                          <input
                            className="admin-input"
                            value={homeContent.businessHours}
                            onChange={(event) => updateHomeField("businessHours", event.target.value)}
                            placeholder="Seg a sex, das 8h as 18h"
                          />
                        </Field>

                        <Field label="Instagram" optional>
                          <input
                            className="admin-input"
                            value={settings.instagramUrl}
                            onChange={(event) => updateSettingsField("instagramUrl", event.target.value)}
                            placeholder="https://instagram.com/..."
                          />
                        </Field>

                        <Field label="Facebook" optional>
                          <input
                            className="admin-input"
                            value={settings.facebookUrl}
                            onChange={(event) => updateSettingsField("facebookUrl", event.target.value)}
                            placeholder="https://facebook.com/..."
                          />
                        </Field>

                        <Field label="Mapa incorporado" optional helpText="Cole um link de incorporacao se ja tiver um mapa pronto.">
                          <input
                            className="admin-input"
                            value={homeContent.mapEmbedUrl}
                            onChange={(event) => updateHomeField("mapEmbedUrl", event.target.value)}
                            placeholder="https://www.google.com/maps/embed?..."
                          />
                        </Field>

                        <Field label="Titulo da secao de contato" optional>
                          <input
                            className="admin-input"
                            value={homeContent.contactTitle}
                            onChange={(event) => updateHomeField("contactTitle", event.target.value)}
                            placeholder="Fale com a gente"
                          />
                        </Field>
                      </div>
                    </>
                  ) : null}

                  {activeStep === "review" ? (
                    <>
                      <Alert variant={hasUnpublishedChanges ? "warning" : "success"} title="Publicacao">
                        {hasUnpublishedChanges
                          ? "Existem alteracoes salvas que ainda nao foram publicadas. Revise a previa e publique quando estiver pronto."
                          : "A versao publicada ja esta alinhada com o rascunho atual."}
                      </Alert>

                      <div className="admin-card-grid">
                        <MetricCard label="Titulo SEO" value={getSiteMetaTitle(draftPreview)} />
                        <MetricCard label="Descricao SEO" value={getSiteMetaDescription(draftPreview)} />
                        <MetricCard label="Servicos ativos" value={String(activeServiceCount)} />
                        <MetricCard label="Imagens em destaque" value={String(activeBannerCount)} />
                      </div>

                      <div className="admin-form-grid admin-form-grid--2">
                        <Field label="Meta title" optional helpText="Usado no titulo do navegador e compartilhamento.">
                          <input
                            className="admin-input"
                            value={homeContent.metaTitle}
                            onChange={(event) => updateHomeField("metaTitle", event.target.value)}
                            placeholder={`${site.tradeName} | Grafica e comunicacao visual`}
                          />
                        </Field>

                        <Field label="Meta description" optional helpText="Resumo curto para busca e compartilhamento.">
                          <textarea
                            className="admin-textarea"
                            value={homeContent.metaDescription}
                            onChange={(event) => updateHomeField("metaDescription", event.target.value)}
                            placeholder="Conheca os servicos da grafica e solicite seu orcamento."
                          />
                        </Field>
                      </div>

                      <Field label="Imagem social" optional helpText="Imagem usada em compartilhamento quando houver suporte.">
                        <input
                          className="admin-input"
                          value={homeContent.socialImageUrl}
                          onChange={(event) => updateHomeField("socialImageUrl", event.target.value)}
                          placeholder="https://..."
                        />
                      </Field>

                      <div className="admin-surface-muted">
                        <strong style={{ display: "block", marginBottom: 8 }}>Estado atual</strong>
                        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                          {settings.isSitePublished
                            ? hasUnpublishedChanges
                              ? "O site publico continua no ar, mas esta diferente do rascunho atual."
                              : "O site publico ja reflete a configuracao revisada."
                            : "O site ainda nao foi publicado. Use a previa ao lado para revisar antes de colocar no ar."}
                        </p>
                      </div>
                    </>
                  ) : null}

                  <div className="admin-row admin-row--between">
                    <div className="admin-row">
                      {previousStep ? (
                        <button type="button" className="admin-button admin-button--ghost" onClick={() => setActiveStep(previousStep)}>
                          Etapa anterior
                        </button>
                      ) : null}
                      {nextStep ? (
                        <button type="button" className="admin-button admin-button--secondary" onClick={() => setActiveStep(nextStep)}>
                          Continuar
                        </button>
                      ) : null}
                    </div>

                    <div className="admin-row">
                      <LoadingButton type="submit" isLoading={isSavingSettings}>
                        Salvar rascunho
                      </LoadingButton>
                      {activeStep === "review" ? (
                        <LoadingButton
                          type="button"
                          isLoading={isSavingSettings}
                          onClick={() => void saveSettings("publish")}
                        >
                          Publicar alteracoes
                        </LoadingButton>
                      ) : null}
                    </div>
                  </div>
                </form>
              </SectionCard>
            </div>

            <aside className="admin-page-stack">
              {hasUnpublishedChanges ? (
                <Alert variant="warning">
                  Existem alteracoes salvas que ainda nao foram publicadas.
                </Alert>
              ) : null}

              <SectionCard
                title="Previa do website"
                description="Revise a home em desktop e mobile usando o mesmo componente da versao publica."
                actions={
                  <Tabs
                    tabs={[
                      { id: "desktop", label: "Desktop" },
                      { id: "mobile", label: "Mobile" },
                    ]}
                    activeTab={previewViewport}
                    onChange={(value) => setPreviewViewport(value as PreviewViewport)}
                  />
                }
              >
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    justifyItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: previewViewport === "desktop" ? 960 : 375,
                      border: "1px solid var(--border)",
                      borderRadius: 24,
                      overflow: "hidden",
                      background: "#fff",
                      boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <SiteHomeView
                      data={draftPreview}
                      previewMode
                      previewLabel={previewViewport === "desktop" ? "Previa desktop" : "Previa mobile"}
                      leadSection={<PreviewLeadSection selectedService={draftPreview.services[0]?.title || ""} />}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Checklist de publicacao" description="Revise o que ainda falta para o site ficar pronto para divulgacao.">
                <div className="admin-page-stack">
                  {stepChecklist.map((item) => (
                    <div key={item.id} className="admin-surface-muted">
                      <div className="admin-row admin-row--between">
                        <strong>{item.label}</strong>
                        <StatusBadge
                          status={item.ready ? "Pronto" : "Pendente"}
                          tone={item.ready ? "success" : "warning"}
                        />
                      </div>
                      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{item.help}</p>
                      {!item.ready ? (
                        <button type="button" className="admin-link-button" onClick={() => setActiveStep(item.id)}>
                          Ir para esta etapa
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Leitura operacional" description="Orientacoes curtas para manter a publicacao sob controle.">
                <ul className="admin-checklist">
                  <li>Salvar rascunho nao publica automaticamente a home.</li>
                  <li>Publique apenas depois de revisar textos, imagens e canais de contato.</li>
                  <li>Use imagens reais dos servicos para valorizar a vitrine comercial.</li>
                </ul>
              </SectionCard>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function resolveHomeDraftContent(site: SiteAdminData) {
  const draftPage = resolveDraftPage(site);
  const content = parseSiteHomeContent(draftPage?.contentJson);

  return {
    ...content,
    metaTitle: draftPage?.metaTitle || content.metaTitle,
    metaDescription: draftPage?.metaDescription || content.metaDescription,
  };
}

function resolveDraftPage(site: SiteAdminData | null) {
  return site?.sitePages?.find((page) => page.pageKey === "HOME_DRAFT") ?? null;
}

function resolvePublishedPage(site: SiteAdminData | null) {
  return site?.sitePages?.find((page) => page.pageKey === "HOME") ?? null;
}

function comparableSnapshot(value: ReturnType<typeof composeDraftSitePublicData>) {
  return JSON.stringify({
    ...value,
    settings: value.settings
      ? {
          ...value.settings,
          isSitePublished: true,
        }
      : null,
  });
}

function mapSettings(
  settings: Partial<Record<keyof SiteSettingsState, string | boolean | null | undefined>>,
) {
  return {
    primaryColor:
      typeof settings.primaryColor === "string" && settings.primaryColor
        ? settings.primaryColor
        : defaultSettings.primaryColor,
    secondaryColor:
      typeof settings.secondaryColor === "string" && settings.secondaryColor
        ? settings.secondaryColor
        : defaultSettings.secondaryColor,
    accentColor:
      typeof settings.accentColor === "string" && settings.accentColor
        ? settings.accentColor
        : defaultSettings.accentColor,
    logoUrl: typeof settings.logoUrl === "string" ? settings.logoUrl : "",
    faviconUrl: typeof settings.faviconUrl === "string" ? settings.faviconUrl : "",
    heroTitle: typeof settings.heroTitle === "string" ? settings.heroTitle : "",
    heroSubtitle: typeof settings.heroSubtitle === "string" ? settings.heroSubtitle : "",
    aboutText: typeof settings.aboutText === "string" ? settings.aboutText : "",
    contactEmail:
      typeof settings.contactEmail === "string"
        ? normalizeEmailInput(settings.contactEmail)
        : "",
    contactPhone:
      typeof settings.contactPhone === "string" ? formatPhone(settings.contactPhone) : "",
    contactWhatsapp:
      typeof settings.contactWhatsapp === "string"
        ? formatPhone(settings.contactWhatsapp)
        : "",
    instagramUrl: typeof settings.instagramUrl === "string" ? settings.instagramUrl : "",
    facebookUrl: typeof settings.facebookUrl === "string" ? settings.facebookUrl : "",
    addressFull: typeof settings.addressFull === "string" ? settings.addressFull : "",
    isSitePublished: Boolean(settings.isSitePublished),
  };
}

function getNeighborStep(current: StepId, offset: -1 | 1) {
  const index = guidedSteps.findIndex((step) => step.id === current);
  return guidedSteps[index + offset]?.id;
}

function PreviewLeadSection({ selectedService }: Readonly<{ selectedService: string }>) {
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
      <div className="admin-form-grid admin-form-grid--2">
        <input className="admin-input" value="Nome do cliente" readOnly />
        <input className="admin-input" value="(11) 99999-9999" readOnly />
      </div>
      <input className="admin-input" value="cliente@empresa.com.br" readOnly />
      <input className="admin-input" value={selectedService || "Servico desejado"} readOnly />
      <textarea
        className="admin-textarea"
        value="Conte o que voce precisa para receber a proposta."
        readOnly
      />
      <div className="admin-row">
        <span className="admin-button admin-button--primary">Solicitar orcamento</span>
        <span className="admin-button admin-button--secondary">Falar pelo WhatsApp</span>
      </div>
    </div>
  );
}
