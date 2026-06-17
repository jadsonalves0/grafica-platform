"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function SiteAdminPage() {
  const [site, setSite] = useState<SiteAdminData | null>(null);
  const [settings, setSettings] = useState<SiteSettingsState>(defaultSettings);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(defaultServiceForm);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(defaultBannerForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
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

    loadSite();

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

  async function handleCreateBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <main style={{ padding: 32, display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gap: 18,
          padding: 28,
          borderRadius: 28,
          background:
            "linear-gradient(135deg, rgba(255,250,244,0.96) 0%, rgba(244,232,217,0.9) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(77, 39, 22, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <p style={eyebrowStyle}>Presenca digital</p>
            <h1 style={{ margin: "12px 0 10px", fontFamily: "var(--font-heading)", fontSize: 46 }}>
              Site institucional
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: 18 }}>
              Ajuste identidade, conteudo, contato e captacao do site publico sem sair do
              painel administrativo.
            </p>
          </div>

          {site?.slug ? (
            <Link href={`/${site.slug}`} target="_blank" style={primaryButtonStyle}>
              Abrir site publico
            </Link>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
          }}
        >
          <SummaryCard label="Grafica" value={site?.tradeName ?? "Carregando..."} />
          <SummaryCard label="Slug" value={site?.slug ?? "-"} />
          <SummaryCard label="Servicos" value={String(site?.siteServices.length ?? 0)} />
          <SummaryCard
            label="Status publico"
            value={settings.isSitePublished ? "Publicado" : "Em rascunho"}
            accent={settings.isSitePublished}
          />
        </div>
      </section>

      {errorMessage ? <p style={{ ...feedbackStyle, ...errorStyle }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ ...feedbackStyle, ...successStyle }}>{successMessage}</p> : null}

      {isLoading || !site ? (
        <section style={loadingPanelStyle}>
          <strong>Carregando configuracao do site...</strong>
          <span style={{ color: "var(--muted)" }}>Estamos montando a visao administrativa.</span>
        </section>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
              alignItems: "start",
            }}
          >
            <form
              onSubmit={handleSaveSettings}
              style={{
                display: "grid",
                gap: 18,
                padding: 24,
                borderRadius: 24,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Configuracao geral</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                  Defina a cara do site e os textos principais que vao orientar a conversao.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <Field label="Cor principal">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(event) => updateSettingsField("primaryColor", event.target.value)}
                    style={colorInputStyle}
                  />
                </Field>
                <Field label="Cor secundaria">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(event) => updateSettingsField("secondaryColor", event.target.value)}
                    style={colorInputStyle}
                  />
                </Field>
                <Field label="Cor de destaque">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(event) => updateSettingsField("accentColor", event.target.value)}
                    style={colorInputStyle}
                  />
                </Field>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <Field label="Titulo principal" required>
                  <input
                    value={settings.heroTitle}
                    onChange={(event) => updateSettingsField("heroTitle", event.target.value)}
                    style={inputStyle}
                    placeholder="Ex.: Impressao rapida com acabamento profissional"
                  />
                </Field>

                <Field label="Logo URL">
                  <input
                    value={settings.logoUrl}
                    onChange={(event) => updateSettingsField("logoUrl", event.target.value)}
                    style={inputStyle}
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Subtitulo do hero">
                  <textarea
                    value={settings.heroSubtitle}
                    onChange={(event) => updateSettingsField("heroSubtitle", event.target.value)}
                    rows={4}
                    style={{ ...inputStyle, minHeight: 120, height: "auto", padding: 14 }}
                    placeholder="Resumo curto com proposta de valor e velocidade de atendimento."
                  />
                </Field>

                <Field label="Sobre a grafica">
                  <textarea
                    value={settings.aboutText}
                    onChange={(event) => updateSettingsField("aboutText", event.target.value)}
                    rows={4}
                    style={{ ...inputStyle, minHeight: 120, height: "auto", padding: 14 }}
                    placeholder="Historia, diferenciais e foco de atendimento."
                  />
                </Field>

                <Field label="E-mail comercial">
                  <input
                    value={settings.contactEmail}
                    onChange={(event) =>
                      updateSettingsField("contactEmail", normalizeEmailInput(event.target.value))
                    }
                    style={inputStyle}
                    placeholder="contato@grafica.com.br"
                  />
                </Field>

                <Field label="Telefone">
                  <input
                    value={settings.contactPhone}
                    onChange={(event) =>
                      updateSettingsField("contactPhone", formatPhone(event.target.value))
                    }
                    style={inputStyle}
                    inputMode="tel"
                    maxLength={15}
                    placeholder="(11) 0000-0000"
                  />
                </Field>

                <Field label="WhatsApp">
                  <input
                    value={settings.contactWhatsapp}
                    onChange={(event) =>
                      updateSettingsField("contactWhatsapp", formatPhone(event.target.value))
                    }
                    style={inputStyle}
                    inputMode="tel"
                    maxLength={15}
                    placeholder="5511999999999"
                  />
                </Field>

                <Field label="Endereco completo">
                  <input
                    value={settings.addressFull}
                    onChange={(event) => updateSettingsField("addressFull", event.target.value)}
                    style={inputStyle}
                    placeholder="Rua, numero, bairro, cidade"
                  />
                </Field>

                <Field label="Instagram URL">
                  <input
                    value={settings.instagramUrl}
                    onChange={(event) => updateSettingsField("instagramUrl", event.target.value)}
                    style={inputStyle}
                    placeholder="https://instagram.com/..."
                  />
                </Field>

                <Field label="Facebook URL">
                  <input
                    value={settings.facebookUrl}
                    onChange={(event) => updateSettingsField("facebookUrl", event.target.value)}
                    style={inputStyle}
                    placeholder="https://facebook.com/..."
                  />
                </Field>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.78)",
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.isSitePublished}
                  onChange={(event) =>
                    updateSettingsField("isSitePublished", event.target.checked)
                  }
                />
                <span>
                  Publicar site para uso comercial e captacao de leads
                </span>
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(232, 217, 202, 0.85)",
                }}
              >
                <button type="submit" disabled={isSavingSettings} style={primaryButtonStyle}>
                  {isSavingSettings ? "Salvando..." : "Salvar configuracao"}
                </button>
              </div>
            </form>

            <aside
              style={{
                display: "grid",
                gap: 18,
                padding: 24,
                borderRadius: 24,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.78)",
                position: "sticky",
                top: 24,
              }}
            >
              <div>
                <p style={eyebrowStyle}>Preview rapido</p>
                <h2 style={{ margin: "10px 0 0", fontFamily: "var(--font-heading)", fontSize: 34 }}>
                  {settings.heroTitle || site.tradeName}
                </h2>
                <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>
                  {settings.heroSubtitle || "Seu resumo comercial vai aparecer aqui assim que voce salvar."}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 18,
                  borderRadius: 20,
                  background: previewPalette.secondaryColor,
                  border: "1px solid rgba(181, 66, 31, 0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <ColorChip color={previewPalette.primaryColor} label="Principal" />
                  <ColorChip color={previewPalette.secondaryColor} label="Secundaria" />
                  <ColorChip color={previewPalette.accentColor} label="Destaque" />
                </div>
                <div
                  style={{
                    height: 12,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${previewPalette.primaryColor} 0%, ${previewPalette.accentColor} 100%)`,
                  }}
                />
                <div style={{ display: "grid", gap: 8 }}>
                  <SmallInfo label="Slug publico" value={`/${site.slug}`} />
                  <SmallInfo label="WhatsApp" value={settings.contactWhatsapp || "Nao informado"} />
                  <SmallInfo label="E-mail" value={settings.contactEmail || "Nao informado"} />
                </div>
              </div>
            </aside>
          </div>

          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              alignItems: "start",
            }}
          >
            <section style={panelStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Servicos exibidos</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                  Monte a vitrine principal do site por tipo de trabalho.
                </p>
              </div>

              <form onSubmit={handleCreateService} style={{ display: "grid", gap: 14 }}>
                {editingServiceId ? (
                  <div style={editingNoticeStyle}>
                    <strong>Edicao de servico ativa.</strong>
                    <span style={{ color: "var(--muted)" }}>
                      Ajuste os dados abaixo ou cancele para cadastrar um novo servico.
                    </span>
                  </div>
                ) : null}

                <Field label="Titulo do servico" required>
                  <input
                    value={serviceForm.title}
                    onChange={(event) => updateServiceField("title", event.target.value)}
                    style={inputStyle}
                    placeholder="Cartoes, panfletos, adesivos..."
                  />
                </Field>

                <Field label="Descricao curta">
                  <textarea
                    value={serviceForm.shortDescription}
                    onChange={(event) => updateServiceField("shortDescription", event.target.value)}
                    rows={4}
                    style={{ ...inputStyle, minHeight: 110, height: "auto", padding: 14 }}
                    placeholder="Resumo comercial do servico."
                  />
                </Field>

                <Field label="Imagem URL">
                  <input
                    value={serviceForm.imageUrl}
                    onChange={(event) => updateServiceField("imageUrl", event.target.value)}
                    style={inputStyle}
                    placeholder="https://..."
                  />
                </Field>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="submit" disabled={isCreatingService} style={secondaryButtonStyle}>
                    {isCreatingService
                      ? editingServiceId
                        ? "Salvando..."
                        : "Adicionando..."
                      : editingServiceId
                        ? "Salvar servico"
                        : "Adicionar servico"}
                  </button>
                  {editingServiceId ? (
                    <button type="button" onClick={cancelServiceEdit} style={ghostActionButtonStyle}>
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>
              </form>

              <div style={{ display: "grid", gap: 12 }}>
                {site.siteServices.length === 0 ? (
                  <EmptyState text="Nenhum servico cadastrado ainda." />
                ) : (
                  site.siteServices.map((service) => (
                    <article key={service.id} style={listCardStyle}>
                      {service.imageUrl ? (
                        <div
                          style={{
                            height: 150,
                            borderRadius: 16,
                            backgroundImage: `url(${service.imageUrl})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                            border: "1px solid rgba(232, 217, 202, 0.9)",
                          }}
                        />
                      ) : (
                        <div style={mediaPlaceholderStyle("linear-gradient(135deg, rgba(181,66,31,0.16), rgba(43,110,82,0.16))")}>
                          Sem imagem
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <strong>{service.title}</strong>
                        <span style={statusPillStyle(service.isActive)}>
                          {service.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                        {service.shortDescription || "Sem descricao resumida."}
                      </span>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => startServiceEdit(service)} style={miniActionButtonStyle}>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleService(service.id, service.isActive)}
                          style={ghostActionButtonStyle}
                        >
                          {service.isActive ? "Inativar" : "Reativar"}
                        </button>
                        <button type="button" onClick={() => handleDeleteService(service.id)} style={dangerActionButtonStyle}>
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section style={panelStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Banners e destaques</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                  Cadastre chamadas de campanha, CTA e argumentos sazonais.
                </p>
              </div>

              <form onSubmit={handleCreateBanner} style={{ display: "grid", gap: 14 }}>
                {editingBannerId ? (
                  <div style={editingNoticeStyle}>
                    <strong>Edicao de banner ativa.</strong>
                    <span style={{ color: "var(--muted)" }}>
                      Ajuste a campanha atual ou cancele para cadastrar um novo destaque.
                    </span>
                  </div>
                ) : null}

                <Field label="Titulo do banner">
                  <input
                    value={bannerForm.title}
                    onChange={(event) => updateBannerField("title", event.target.value)}
                    style={inputStyle}
                    placeholder="Entrega no mesmo dia"
                  />
                </Field>

                <Field label="Subtitulo">
                  <textarea
                    value={bannerForm.subtitle}
                    onChange={(event) => updateBannerField("subtitle", event.target.value)}
                    rows={4}
                    style={{ ...inputStyle, minHeight: 110, height: "auto", padding: 14 }}
                    placeholder="Mensagem de apoio para a campanha."
                  />
                </Field>

                <Field label="Texto do botao">
                  <input
                    value={bannerForm.ctaLabel}
                    onChange={(event) => updateBannerField("ctaLabel", event.target.value)}
                    style={inputStyle}
                    placeholder="Pedir orcamento"
                  />
                </Field>

                <Field label="Link do botao">
                  <input
                    value={bannerForm.ctaLink}
                    onChange={(event) => updateBannerField("ctaLink", event.target.value)}
                    style={inputStyle}
                    placeholder="https://wa.me/..."
                  />
                </Field>

                <Field label="Imagem URL">
                  <input
                    value={bannerForm.imageUrl}
                    onChange={(event) => updateBannerField("imageUrl", event.target.value)}
                    style={inputStyle}
                    placeholder="https://..."
                  />
                </Field>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="submit" disabled={isCreatingBanner} style={secondaryButtonStyle}>
                    {isCreatingBanner
                      ? editingBannerId
                        ? "Salvando..."
                        : "Adicionando..."
                      : editingBannerId
                        ? "Salvar banner"
                        : "Adicionar banner"}
                  </button>
                  {editingBannerId ? (
                    <button type="button" onClick={cancelBannerEdit} style={ghostActionButtonStyle}>
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>
              </form>

              <div style={{ display: "grid", gap: 12 }}>
                {site.siteBanners.length === 0 ? (
                  <EmptyState text="Nenhum banner cadastrado ainda." />
                ) : (
                  site.siteBanners.map((banner) => (
                    <article key={banner.id} style={listCardStyle}>
                      {banner.imageUrl ? (
                        <div
                          style={{
                            height: 150,
                            borderRadius: 16,
                            backgroundImage: `url(${banner.imageUrl})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                            border: "1px solid rgba(232, 217, 202, 0.9)",
                          }}
                        />
                      ) : (
                        <div style={mediaPlaceholderStyle("linear-gradient(135deg, rgba(43,110,82,0.16), rgba(181,66,31,0.16))")}>
                          Sem imagem
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <strong>{banner.title || "Banner sem titulo"}</strong>
                        <span style={statusPillStyle(banner.isActive)}>
                          {banner.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                        {banner.subtitle || "Sem subtitulo."}
                      </span>
                      {banner.ctaLabel ? (
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                          CTA: {banner.ctaLabel}
                        </span>
                      ) : null}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => startBannerEdit(banner)} style={miniActionButtonStyle}>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBanner(banner.id, banner.isActive)}
                          style={ghostActionButtonStyle}
                        >
                          {banner.isActive ? "Inativar" : "Reativar"}
                        </button>
                        <button type="button" onClick={() => handleDeleteBanner(banner.id)} style={dangerActionButtonStyle}>
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
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

function Field({
  label,
  required,
  children,
}: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>
        {label}
        {required ? <strong style={{ color: "var(--primary)" }}> *</strong> : null}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 22,
        background: accent ? "rgba(43, 110, 82, 0.12)" : "rgba(255,255,255,0.72)",
        border: "1px solid rgba(232, 217, 202, 0.9)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: accent ? "#245844" : "var(--primary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: 34 }}>{value}</h2>
    </article>
  );
}

function ColorChip({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        justifyItems: "center",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.75)",
          background: color,
          boxShadow: "0 10px 24px rgba(77, 39, 22, 0.14)",
        }}
      />
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

function SmallInfo({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed var(--border)",
        background: "rgba(255,255,255,0.55)",
        color: "var(--muted)",
      }}
    >
      {text}
    </div>
  );
}

function statusPillStyle(isActive: boolean) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    background: isActive ? "rgba(43, 110, 82, 0.12)" : "rgba(117, 117, 117, 0.18)",
    color: isActive ? "#245844" : "#4d4d4d",
    fontWeight: 700,
  } as const;
}

function mediaPlaceholderStyle(background: string) {
  return {
    height: 150,
    borderRadius: 16,
    border: "1px solid rgba(232, 217, 202, 0.9)",
    background,
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    color: "var(--primary)",
  } as const;
}

const eyebrowStyle = {
  margin: 0,
  color: "var(--primary)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
} as const;

const panelStyle = {
  display: "grid",
  gap: 18,
  padding: 24,
  borderRadius: 24,
  border: "1px solid var(--border)",
  background: "var(--surface)",
} as const;

const listCardStyle = {
  display: "grid",
  gap: 8,
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.78)",
} as const;

const editingNoticeStyle = {
  display: "grid",
  gap: 6,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(181, 66, 31, 0.18)",
  background: "rgba(181, 66, 31, 0.08)",
} as const;

const inputStyle = {
  height: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const colorInputStyle = {
  height: 56,
  padding: 8,
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "#fff",
  width: "100%",
} as const;

const primaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const secondaryButtonStyle = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const miniActionButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(181, 66, 31, 0.16)",
  background: "rgba(181, 66, 31, 0.08)",
  color: "var(--primary)",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const ghostActionButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(232, 217, 202, 0.95)",
  background: "#fff",
  color: "inherit",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const dangerActionButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(167, 45, 45, 0.2)",
  background: "rgba(167, 45, 45, 0.08)",
  color: "#8b2323",
  fontWeight: 700,
  cursor: "pointer",
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

const successStyle = {
  background: "rgba(43, 110, 82, 0.12)",
  color: "#245844",
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
