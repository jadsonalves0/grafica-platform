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
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type StepId = "identity" | "home" | "services" | "contact" | "review";

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
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(defaultServiceForm);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(defaultBannerForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("identity");
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

  const previewPalette = useMemo(
    () => ({
      primaryColor: settings.primaryColor || defaultSettings.primaryColor,
      secondaryColor: settings.secondaryColor || defaultSettings.secondaryColor,
      accentColor: settings.accentColor || defaultSettings.accentColor,
    }),
    [settings.accentColor, settings.primaryColor, settings.secondaryColor],
  );

  const activeServiceCount = site?.siteServices.filter((service) => service.isActive).length ?? 0;
  const activeBannerCount = site?.siteBanners.filter((banner) => banner.isActive).length ?? 0;

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
        help: "Preencha titulo e subtitulo para orientar a proposta comercial do site.",
      },
      {
        id: "services" as StepId,
        label: "Servicos publicados",
        ready: activeServiceCount > 0,
        help: "Publique pelo menos um servico para o visitante entender o que a grafica oferece.",
      },
      {
        id: "contact" as StepId,
        label: "Contato configurado",
        ready:
          Boolean(settings.contactEmail.trim()) ||
          Boolean(settings.contactPhone.trim()) ||
          Boolean(settings.contactWhatsapp.trim()),
        help: "Informe ao menos um canal de contato direto para o lead nao ficar sem resposta.",
      },
      {
        id: "review" as StepId,
        label: "Site publicado",
        ready: settings.isSitePublished,
        help: "Publique somente quando a revisao final estiver pronta para captacao.",
      },
    ],
    [
      activeServiceCount,
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

  const incompleteChecklist = stepChecklist.filter((item) => !item.ready);
  const completionCount = stepChecklist.filter((item) => item.ready).length;
  const nextStep = getNeighborStep(activeStep, 1);
  const previousStep = getNeighborStep(activeStep, -1);

  function updateSettingsField<K extends keyof SiteSettingsState>(
    field: K,
    value: SiteSettingsState[K],
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateServiceField<K extends keyof ServiceFormState>(
    field: K,
    value: ServiceFormState[K],
  ) {
    setServiceForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBannerField<K extends keyof BannerFormState>(
    field: K,
    value: BannerFormState[K],
  ) {
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
    setActiveStep("home");
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
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        }),
      });

      const result = (await response.json()) as ApiResult<{ saved: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel salvar a configuracao do site.");
        return;
      }

      await refreshSite();
      setSuccessMessage("Configuracao do site salva com sucesso.");
    } catch {
      setErrorMessage("Falha ao salvar a configuracao do site.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleCreateService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site) return;

    setIsCreatingService(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingServiceId);
      const response = await fetch(isEditing ? `/api/site/services/${editingServiceId}` : "/api/site/services", {
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
      });

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

  async function handleCreateBanner(
    event?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) {
    event?.preventDefault();
    if (!site) return;

    setIsCreatingBanner(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingBannerId);
      const response = await fetch(isEditing ? `/api/site/banners/${editingBannerId}` : "/api/site/banners", {
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
      });

      const result = (await response.json()) as ApiResult<{ created?: true; updated?: true }>;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel adicionar o banner.");
        return;
      }

      setBannerForm(defaultBannerForm);
      setEditingBannerId(null);
      await refreshSite();
      setSuccessMessage(isEditing ? "Banner atualizado com sucesso." : "Banner adicionado ao site.");
    } catch {
      setErrorMessage("Falha ao adicionar o banner.");
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
      setSuccessMessage(!isActive ? "Servico reativado com sucesso." : "Servico inativado com sucesso.");
    } catch {
      setErrorMessage("Falha ao atualizar o servico.");
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!site || !window.confirm("Deseja excluir este servico do site?")) {
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
        setErrorMessage(result.message ?? "Nao foi possivel atualizar o banner.");
        return;
      }

      await refreshSite();
      setSuccessMessage(!isActive ? "Banner reativado com sucesso." : "Banner inativado com sucesso.");
    } catch {
      setErrorMessage("Falha ao atualizar o banner.");
    }
  }

  async function handleDeleteBanner(bannerId: string) {
    if (!site || !window.confirm("Deseja excluir este banner do site?")) {
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
        setErrorMessage(result.message ?? "Nao foi possivel excluir o banner.");
        return;
      }

      if (editingBannerId === bannerId) {
        cancelBannerEdit();
      }

      await refreshSite();
      setSuccessMessage("Banner excluido com sucesso.");
    } catch {
      setErrorMessage("Falha ao excluir o banner.");
    }
  }

  return (
    <main className="admin-page-stack">
      <PageHeader
        breadcrumbs={[{ label: "Website" }, { label: "Visao geral" }]}
        title="Website configuravel"
        description="Configure a identidade, a pagina inicial, os servicos e os contatos em um fluxo guiado e facil de revisar."
        secondaryActions={
          site?.slug
            ? [{ href: `/${site.slug}`, label: "Visualizar site", variant: "secondary", target: "_blank" }]
            : []
        }
      />

      {errorMessage ? (
        <Alert variant="danger" title="Nao foi possivel concluir a operacao">
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      {isLoading || !site ? (
        <SectionCard title="Carregando configuracoes do site">
          <Skeleton lines={8} />
        </SectionCard>
      ) : (
        <>
          <div className="admin-card-grid">
            <MetricCard
              label="Status do site"
              value={settings.isSitePublished ? "Publicado" : "Rascunho"}
              description={settings.isSitePublished ? "Pronto para captacao." : "Aguardando revisao final."}
            />
            <MetricCard label="Slug publico" value={`/${site.slug}`} description="Endereco principal do site." />
            <MetricCard
              label="Servicos ativos"
              value={String(activeServiceCount)}
              description="Itens da vitrine comercial."
            />
            <MetricCard
              label="Etapas completas"
              value={`${completionCount}/${stepChecklist.length}`}
              description="Andamento da configuracao guiada."
            />
          </div>

          <div className="admin-layout-grid admin-layout-grid--sidebar">
            <div className="admin-page-stack">
              <SectionCard
                title="Assistente de configuracao"
                description="Siga as etapas abaixo para deixar o site consistente antes de publicar."
                actions={
                  <Tabs
                    tabs={guidedSteps}
                    activeTab={activeStep}
                    onChange={(value) => setActiveStep(value as StepId)}
                  />
                }
              >
                {activeStep === "services" ? (
                  <div className="admin-page-stack">
                    <form className="admin-page-stack" onSubmit={handleCreateService}>
                      <div className="admin-inline-stack">
                        {editingServiceId ? (
                          <Alert variant="info" title="Edicao de servico ativa">
                            Ajuste os dados abaixo ou cancele para voltar ao cadastro de um novo servico.
                          </Alert>
                        ) : null}

                        <div className="admin-form-grid admin-form-grid--2">
                          <Field
                            label="Nome do servico"
                            required
                            helpText="Use o nome pelo qual esse servico e conhecido comercialmente."
                          >
                            <input
                              className="admin-input"
                              value={serviceForm.title}
                              onChange={(event) => updateServiceField("title", event.target.value)}
                              placeholder="Ex.: Cartoes, banners e adesivos"
                            />
                          </Field>

                          <Field
                            label="Imagem de destaque"
                            optional
                            helpText="Cole a URL de uma imagem para reforcar o servico no site."
                          >
                            <input
                              className="admin-input"
                              value={serviceForm.imageUrl}
                              onChange={(event) => updateServiceField("imageUrl", event.target.value)}
                              placeholder="https://..."
                            />
                          </Field>
                        </div>

                        <Field
                          label="Descricao curta"
                          optional
                          helpText="Explique rapidamente o beneficio ou o tipo de material entregue."
                        >
                          <textarea
                            className="admin-textarea"
                            value={serviceForm.shortDescription}
                            onChange={(event) => updateServiceField("shortDescription", event.target.value)}
                            placeholder="Resumo comercial do servico."
                          />
                        </Field>
                      </div>

                      <div className="admin-row admin-row--between">
                        <div className="admin-row">
                          {previousStep ? (
                            <button
                              type="button"
                              className="admin-button admin-button--ghost"
                              onClick={() => setActiveStep(previousStep)}
                            >
                              Etapa anterior
                            </button>
                          ) : null}
                          {nextStep ? (
                            <button
                              type="button"
                              className="admin-button admin-button--secondary"
                              onClick={() => setActiveStep(nextStep)}
                            >
                              Continuar
                            </button>
                          ) : null}
                        </div>

                        <div className="admin-row">
                          {editingServiceId ? (
                            <button type="button" className="admin-button admin-button--ghost" onClick={cancelServiceEdit}>
                              Cancelar edicao
                            </button>
                          ) : null}
                          <LoadingButton type="submit" isLoading={isCreatingService}>
                            {editingServiceId ? "Salvar servico" : "Adicionar servico"}
                          </LoadingButton>
                        </div>
                      </div>
                    </form>

                    <SectionCard
                      title="Servicos publicados"
                      description="Ative somente o que ja estiver pronto para exibicao no site."
                    >
                      <div className="admin-list-stack">
                        {site.siteServices.length === 0 ? (
                          <EmptyState
                            title="Nenhum servico cadastrado"
                            description="Adicione o primeiro servico para montar a vitrine do website."
                          />
                        ) : (
                          site.siteServices.map((service) => (
                            <article key={service.id} className="admin-list-card">
                              {service.imageUrl ? (
                                <div
                                  className="admin-media-placeholder"
                                  style={{
                                    backgroundImage: `url(${service.imageUrl})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    borderStyle: "solid",
                                  }}
                                />
                              ) : (
                                <div className="admin-media-placeholder">Sem imagem de apoio</div>
                              )}

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
                                <button
                                  type="button"
                                  className="admin-button admin-button--secondary"
                                  onClick={() => startServiceEdit(service)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="admin-button admin-button--ghost"
                                  onClick={() => handleToggleService(service.id, service.isActive)}
                                >
                                  {service.isActive ? "Inativar" : "Reativar"}
                                </button>
                                <button
                                  type="button"
                                  className="admin-button admin-button--danger"
                                  onClick={() => handleDeleteService(service.id)}
                                >
                                  Excluir
                                </button>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </SectionCard>
                  </div>
                ) : (
                  <form className="admin-page-stack" onSubmit={handleSaveSettings}>
                    {activeStep === "identity" ? (
                      <>
                        <Alert variant="info">
                          Defina a base visual da empresa. Aqui voce configura os elementos que vao identificar a marca em qualquer tela publica.
                        </Alert>

                        <div className="admin-form-grid admin-form-grid--3">
                          <Field label="Cor principal" required helpText="Usada em botoes e destaques principais.">
                            <input
                              type="color"
                              value={settings.primaryColor}
                              onChange={(event) => updateSettingsField("primaryColor", event.target.value)}
                              className="admin-input"
                              style={{ padding: 6 }}
                            />
                          </Field>
                          <Field label="Cor secundaria" required helpText="Base suave para fundos e contrastes leves.">
                            <input
                              type="color"
                              value={settings.secondaryColor}
                              onChange={(event) => updateSettingsField("secondaryColor", event.target.value)}
                              className="admin-input"
                              style={{ padding: 6 }}
                            />
                          </Field>
                          <Field label="Cor de destaque" required helpText="Use para chamadas comerciais e pequenos acentos.">
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
                          <Field label="Logotipo" optional helpText="Cole a URL do logotipo institucional.">
                            <input
                              className="admin-input"
                              value={settings.logoUrl}
                              onChange={(event) => updateSettingsField("logoUrl", event.target.value)}
                              placeholder="https://..."
                            />
                          </Field>
                          <Field label="Favicon" optional helpText="Icone pequeno usado na aba do navegador.">
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
                          Monte a primeira impressao do visitante com uma proposta clara, um texto curto e os banners que vao apoiar a conversao.
                        </Alert>

                        <div className="admin-form-grid admin-form-grid--2">
                          <Field label="Titulo principal" required helpText="Frase principal da dobra inicial do site.">
                            <input
                              className="admin-input"
                              value={settings.heroTitle}
                              onChange={(event) => updateSettingsField("heroTitle", event.target.value)}
                              placeholder="Impressao rapida com acabamento profissional"
                            />
                          </Field>
                          <Field label="Subtitulo" required helpText="Explique em uma ou duas linhas o diferencial da grafica.">
                            <textarea
                              className="admin-textarea"
                              value={settings.heroSubtitle}
                              onChange={(event) => updateSettingsField("heroSubtitle", event.target.value)}
                              placeholder="Atendimento agil, producao confiavel e entrega no prazo."
                            />
                          </Field>
                        </div>

                        <Field label="Texto institucional" optional helpText="Conte rapidamente quem e a grafica e em que ela se destaca.">
                          <textarea
                            className="admin-textarea"
                            value={settings.aboutText}
                            onChange={(event) => updateSettingsField("aboutText", event.target.value)}
                            placeholder="Historia, diferenciais e foco de atendimento."
                          />
                        </Field>

                        <FormSection
                          title="Banners da pagina inicial"
                          description="Cadastre banners promocionais e chamadas de campanha sem sair do fluxo guiado."
                          defaultOpen={Boolean(editingBannerId)}
                        >
                          <div className="admin-inline-stack">
                            {editingBannerId ? (
                              <Alert variant="info" title="Edicao de banner ativa">
                                Ajuste esta campanha ou cancele para voltar ao cadastro de um novo banner.
                              </Alert>
                            ) : null}

                            <div className="admin-inline-stack">
                              <div className="admin-form-grid admin-form-grid--2">
                                <Field label="Titulo do banner" optional>
                                  <input
                                    className="admin-input"
                                    value={bannerForm.title}
                                    onChange={(event) => updateBannerField("title", event.target.value)}
                                    placeholder="Entrega no mesmo dia"
                                  />
                                </Field>
                                <Field label="Texto do botao" optional>
                                  <input
                                    className="admin-input"
                                    value={bannerForm.ctaLabel}
                                    onChange={(event) => updateBannerField("ctaLabel", event.target.value)}
                                    placeholder="Pedir orcamento"
                                  />
                                </Field>
                              </div>

                              <Field label="Subtitulo" optional>
                                <textarea
                                  className="admin-textarea"
                                  value={bannerForm.subtitle}
                                  onChange={(event) => updateBannerField("subtitle", event.target.value)}
                                  placeholder="Mensagem de apoio para a campanha."
                                />
                              </Field>

                              <div className="admin-form-grid admin-form-grid--2">
                                <Field label="Link do botao" optional>
                                  <input
                                    className="admin-input"
                                    value={bannerForm.ctaLink}
                                    onChange={(event) => updateBannerField("ctaLink", event.target.value)}
                                    placeholder="https://wa.me/..."
                                  />
                                </Field>
                                <Field label="Imagem do banner" optional>
                                  <input
                                    className="admin-input"
                                    value={bannerForm.imageUrl}
                                    onChange={(event) => updateBannerField("imageUrl", event.target.value)}
                                    placeholder="https://..."
                                  />
                                </Field>
                              </div>

                              <div className="admin-row">
                                {editingBannerId ? (
                                  <button type="button" className="admin-button admin-button--ghost" onClick={cancelBannerEdit}>
                                    Cancelar edicao
                                  </button>
                                ) : null}
                                <LoadingButton type="button" isLoading={isCreatingBanner} onClick={handleCreateBanner}>
                                  {editingBannerId ? "Salvar banner" : "Adicionar banner"}
                                </LoadingButton>
                              </div>
                            </div>

                            <div className="admin-list-stack">
                              {site.siteBanners.length === 0 ? (
                                <EmptyState
                                  title="Nenhum banner cadastrado"
                                  description="Adicione banners para reforcar campanhas, entregas urgentes ou chamadas sazonais."
                                />
                              ) : (
                                site.siteBanners.map((banner) => (
                                  <article key={banner.id} className="admin-list-card">
                                    {banner.imageUrl ? (
                                      <div
                                        className="admin-media-placeholder"
                                        style={{
                                          backgroundImage: `url(${banner.imageUrl})`,
                                          backgroundSize: "cover",
                                          backgroundPosition: "center",
                                          borderStyle: "solid",
                                        }}
                                      />
                                    ) : (
                                      <div className="admin-media-placeholder">Sem imagem de apoio</div>
                                    )}

                                    <div className="admin-row admin-row--between">
                                      <strong>{banner.title || "Banner sem titulo"}</strong>
                                      <StatusBadge
                                        status={banner.isActive ? "Ativo" : "Inativo"}
                                        tone={banner.isActive ? "success" : "neutral"}
                                      />
                                    </div>

                                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                                      {banner.subtitle || "Sem subtitulo."}
                                    </p>

                                    {banner.ctaLabel ? (
                                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                                        CTA: {banner.ctaLabel}
                                      </span>
                                    ) : null}

                                    <div className="admin-row">
                                      <button
                                        type="button"
                                        className="admin-button admin-button--secondary"
                                        onClick={() => startBannerEdit(banner)}
                                      >
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-button admin-button--ghost"
                                        onClick={() => handleToggleBanner(banner.id, banner.isActive)}
                                      >
                                        {banner.isActive ? "Inativar" : "Reativar"}
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-button admin-button--danger"
                                        onClick={() => handleDeleteBanner(banner.id)}
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  </article>
                                ))
                              )}
                            </div>
                          </div>
                        </FormSection>
                      </>
                    ) : null}

                    {activeStep === "contact" ? (
                      <>
                        <Alert variant="info">
                          Deixe pelo menos um canal de contato pronto. Isso evita que o lead encontre o site, mas nao consiga falar com a grafica.
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
                              onChange={(event) =>
                                updateSettingsField("contactPhone", formatPhone(event.target.value))
                              }
                              inputMode="tel"
                              maxLength={15}
                              placeholder="(11) 0000-0000"
                            />
                          </Field>

                          <Field label="WhatsApp" optional>
                            <input
                              className="admin-input"
                              value={settings.contactWhatsapp}
                              onChange={(event) =>
                                updateSettingsField("contactWhatsapp", formatPhone(event.target.value))
                              }
                              inputMode="tel"
                              maxLength={15}
                              placeholder="(11) 99999-9999"
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
                        </div>
                      </>
                    ) : null}

                    {activeStep === "review" ? (
                      <>
                        <Alert variant={incompleteChecklist.length ? "warning" : "success"} title="Revisao final">
                          {incompleteChecklist.length
                            ? "Ainda existem pontos pendentes antes de publicar. Revise o checklist ao lado para evitar um site incompleto."
                            : "As etapas principais estao prontas. Agora voce pode publicar ou manter salvo em rascunho."}
                        </Alert>

                        <div className="admin-card-grid">
                          <MetricCard label="Titulo principal" value={settings.heroTitle || "Nao informado"} />
                          <MetricCard label="Contato principal" value={settings.contactWhatsapp || settings.contactPhone || settings.contactEmail || "Nao informado"} />
                          <MetricCard label="Servicos ativos" value={String(activeServiceCount)} />
                          <MetricCard label="Banners ativos" value={String(activeBannerCount)} />
                        </div>

                        <label className="admin-checkbox-row">
                          <input
                            type="checkbox"
                            checked={settings.isSitePublished}
                            onChange={(event) =>
                              updateSettingsField("isSitePublished", event.target.checked)
                            }
                          />
                          <span>
                            <strong style={{ display: "block", marginBottom: 4 }}>
                              Publicar site para uso comercial
                            </strong>
                            O site ficara disponivel para exibicao publica e captacao de novos leads.
                          </span>
                        </label>
                      </>
                    ) : null}

                    <div className="admin-row admin-row--between">
                      <div className="admin-row">
                        {previousStep ? (
                          <button
                            type="button"
                            className="admin-button admin-button--ghost"
                            onClick={() => setActiveStep(previousStep)}
                          >
                            Etapa anterior
                          </button>
                        ) : null}
                        {nextStep ? (
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => setActiveStep(nextStep)}
                          >
                            Continuar
                          </button>
                        ) : null}
                      </div>

                      <LoadingButton type="submit" isLoading={isSavingSettings}>
                        {activeStep === "review"
                          ? settings.isSitePublished
                            ? "Salvar e manter publicado"
                            : "Salvar configuracao"
                          : "Salvar etapa"}
                      </LoadingButton>
                    </div>
                  </form>
                )}
              </SectionCard>
            </div>

            <aside className="admin-page-stack">
              <SectionCard title="Previa rapida" description="Resumo visual para revisar a comunicacao do site antes de publicar.">
                <div className="admin-visual-preview">
                  <div className="admin-row">
                    <PreviewColorSwatch color={previewPalette.primaryColor} label="Principal" />
                    <PreviewColorSwatch color={previewPalette.secondaryColor} label="Secundaria" />
                    <PreviewColorSwatch color={previewPalette.accentColor} label="Destaque" />
                  </div>

                  <div
                    style={{
                      minHeight: 160,
                      borderRadius: 16,
                      padding: 24,
                      background: `linear-gradient(135deg, ${previewPalette.secondaryColor} 0%, #ffffff 100%)`,
                      border: "1px solid var(--border)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <span style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {site.tradeName}
                    </span>
                    <strong style={{ fontSize: 28, lineHeight: 1.1 }}>
                      {settings.heroTitle || "Seu titulo principal aparecera aqui"}
                    </strong>
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                      {settings.heroSubtitle || "O resumo comercial da pagina inicial aparecera aqui quando estiver preenchido."}
                    </p>
                  </div>

                  <div className="admin-summary-list">
                    <PreviewInfoRow label="Slug publico" value={`/${site.slug}`} />
                    <PreviewInfoRow label="WhatsApp" value={settings.contactWhatsapp || "Nao informado"} />
                    <PreviewInfoRow label="E-mail" value={settings.contactEmail || "Nao informado"} />
                    <PreviewInfoRow label="Publicacao" value={settings.isSitePublished ? "Publicado" : "Rascunho"} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Checklist de publicacao" description="Revise o que ja esta pronto e o que ainda precisa de atencao.">
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
                        <button
                          type="button"
                          className="admin-link-button"
                          onClick={() => setActiveStep(item.id)}
                        >
                          Ir para esta etapa
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Leitura operacional" description="Resumo rapido para quem esta configurando o site pela primeira vez.">
                <ul className="admin-checklist">
                  <li>Salve as etapas sem medo. O site pode continuar em rascunho ate a revisao final.</li>
                  <li>Publique pelo menos um servico antes de divulgar o link publicamente.</li>
                  <li>Garanta um canal de contato direto para nao perder leads.</li>
                </ul>
              </SectionCard>
            </aside>
          </div>
        </>
      )}
    </main>
  );
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
  const nextIndex = index + offset;
  return guidedSteps[nextIndex]?.id;
}

function PreviewColorSwatch({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: color,
          border: "2px solid #fff",
          boxShadow: "0 0 0 1px var(--border)",
        }}
      />
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

function PreviewInfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="admin-summary-row">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}
