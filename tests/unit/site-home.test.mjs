import assert from "node:assert/strict";

import {
  composeDraftSitePublicData,
  createDefaultSiteHomeContent,
  parsePublishedSiteSnapshot,
  parseSiteHomeContent,
  stringifySiteHomeContent,
} from "../../src/lib/site/site-home.ts";

const defaultHome = createDefaultSiteHomeContent();

export const cases = [
  {
    name: "recupera configuracao padrao quando o json da home estiver invalido",
    run() {
      const parsed = parseSiteHomeContent("{invalido");
      assert.equal(parsed.heroPrimaryCta.label, defaultHome.heroPrimaryCta.label);
      assert.equal(parsed.differentials.length, 4);
      assert.equal(parsed.howItWorks.length, 3);
    },
  },
  {
    name: "serializa e recompõe o snapshot publico com servicos e banners ativos",
    run() {
      const snapshot = composeDraftSitePublicData({
        company: {
          id: "company-1",
          tradeName: "Ponto Print",
          slug: "ponto-print",
        },
        settings: {
          primaryColor: "#b5421f",
          secondaryColor: "#f5ede3",
          accentColor: "#2b6e52",
          heroTitle: "Hero",
          heroSubtitle: "Subtitulo",
          aboutText: "Texto institucional",
          contactEmail: "contato@pontoprint.local",
          contactPhone: "(11) 3333-4444",
          contactWhatsapp: "(11) 99999-8888",
          instagramUrl: "",
          facebookUrl: "",
          addressFull: "Rua A",
          logoUrl: "",
          faviconUrl: "",
          isSitePublished: false,
        },
        services: [
          { id: "service-1", title: "Cartoes", shortDescription: "Impressos", imageUrl: "", isActive: true },
          { id: "service-2", title: "Interno", shortDescription: "", imageUrl: "", isActive: false },
        ],
        banners: [
          { id: "banner-1", title: "Banner ativo", subtitle: "", imageUrl: "", ctaLabel: "", ctaLink: "", isActive: true },
          { id: "banner-2", title: "Banner oculto", subtitle: "", imageUrl: "", ctaLabel: "", ctaLink: "", isActive: false },
        ],
        homeContent: {
          ...defaultHome,
          heroEyebrow: "Nova camada",
        },
        isPublished: true,
      });

      const parsed = parsePublishedSiteSnapshot(JSON.stringify(snapshot));

      assert.ok(parsed);
      assert.equal(parsed.company.slug, "ponto-print");
      assert.equal(parsed.settings.isSitePublished, true);
      assert.equal(parsed.services.length, 1);
      assert.equal(parsed.banners.length, 1);
      assert.equal(parsed.home.heroEyebrow, "Nova camada");
    },
  },
  {
    name: "mantem o conteudo da home consistente ao serializar e desserializar",
    run() {
      const serialized = stringifySiteHomeContent({
        ...defaultHome,
        finalCtaTitle: "Tem um projeto em mente?",
      });
      const parsed = parseSiteHomeContent(serialized);

      assert.equal(parsed.finalCtaTitle, "Tem um projeto em mente?");
      assert.equal(parsed.heroSecondaryCta.action, defaultHome.heroSecondaryCta.action);
    },
  },
];
