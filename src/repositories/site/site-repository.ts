import type { PrismaClient, SiteLeadStatus } from "@prisma/client";
import {
  SITE_HOME_DRAFT_PAGE_KEY,
  SITE_HOME_DRAFT_PAGE_SLUG,
  SITE_HOME_PAGE_KEY,
  SITE_HOME_PAGE_SLUG,
} from "@/lib/site/site-home";

export class SiteRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertSettings(input: {
    companyId: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    aboutText?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    addressFull?: string;
    isSitePublished?: boolean;
  }) {
    return this.db.siteSetting.upsert({
      where: {
        companyId: input.companyId,
      },
      update: mapSettings(input),
      create: {
        companyId: input.companyId,
        ...mapSettings(input),
      },
    });
  }

  async createService(input: {
    companyId: string;
    title: string;
    shortDescription?: string;
    imageUrl?: string;
    sortOrder: number;
  }) {
    return this.db.siteService.create({
      data: {
        companyId: input.companyId,
        title: input.title,
        shortDescription: normalizeEmpty(input.shortDescription),
        imageUrl: normalizeEmpty(input.imageUrl),
        sortOrder: input.sortOrder,
      },
    });
  }

  async findServiceById(companyId: string, serviceId: string) {
    return this.db.siteService.findFirst({
      where: {
        id: serviceId,
        companyId,
      },
    });
  }

  async updateService(
    serviceId: string,
    input: {
      title: string;
      shortDescription?: string;
      imageUrl?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.db.siteService.update({
      where: { id: serviceId },
      data: {
        title: input.title,
        shortDescription: normalizeEmpty(input.shortDescription),
        imageUrl: normalizeEmpty(input.imageUrl),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async deleteService(serviceId: string) {
    return this.db.siteService.delete({
      where: { id: serviceId },
    });
  }

  async createBanner(input: {
    companyId: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaLink?: string;
    sortOrder: number;
  }) {
    return this.db.siteBanner.create({
      data: {
        companyId: input.companyId,
        title: normalizeEmpty(input.title),
        subtitle: normalizeEmpty(input.subtitle),
        imageUrl: normalizeEmpty(input.imageUrl),
        ctaLabel: normalizeEmpty(input.ctaLabel),
        ctaLink: normalizeEmpty(input.ctaLink),
        sortOrder: input.sortOrder,
      },
    });
  }

  async findBannerById(companyId: string, bannerId: string) {
    return this.db.siteBanner.findFirst({
      where: {
        id: bannerId,
        companyId,
      },
    });
  }

  async updateBanner(
    bannerId: string,
    input: {
      title?: string;
      subtitle?: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaLink?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.db.siteBanner.update({
      where: { id: bannerId },
      data: {
        title: normalizeEmpty(input.title),
        subtitle: normalizeEmpty(input.subtitle),
        imageUrl: normalizeEmpty(input.imageUrl),
        ctaLabel: normalizeEmpty(input.ctaLabel),
        ctaLink: normalizeEmpty(input.ctaLink),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async deleteBanner(bannerId: string) {
    return this.db.siteBanner.delete({
      where: { id: bannerId },
    });
  }

  async getPublicSiteBySlug(slug: string) {
    return this.db.company.findUnique({
      where: { slug },
      include: {
        siteSettings: true,
        siteServices: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        siteBanners: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        sitePages: {
          where: {
            pageKey: SITE_HOME_PAGE_KEY,
            slug: SITE_HOME_PAGE_SLUG,
            isPublished: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
    });
  }

  async getAdminSiteData(companyId: string) {
    return this.db.company.findUnique({
      where: { id: companyId },
      include: {
        siteSettings: true,
        siteServices: {
          orderBy: { sortOrder: "asc" },
        },
        siteBanners: {
          orderBy: { sortOrder: "asc" },
        },
        sitePages: {
          where: {
            pageKey: {
              in: [SITE_HOME_PAGE_KEY, SITE_HOME_DRAFT_PAGE_KEY],
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    });
  }

  async upsertDraftHomePage(input: {
    companyId: string;
    title: string;
    metaTitle?: string;
    metaDescription?: string;
    contentJson?: string;
  }) {
    return this.db.sitePage.upsert({
      where: {
        companyId_slug: {
          companyId: input.companyId,
          slug: SITE_HOME_DRAFT_PAGE_SLUG,
        },
      },
      update: {
        pageKey: SITE_HOME_DRAFT_PAGE_KEY,
        title: input.title,
        metaTitle: normalizeEmpty(input.metaTitle),
        metaDescription: normalizeEmpty(input.metaDescription),
        contentJson: normalizeEmpty(input.contentJson),
        isPublished: false,
      },
      create: {
        companyId: input.companyId,
        pageKey: SITE_HOME_DRAFT_PAGE_KEY,
        title: input.title,
        slug: SITE_HOME_DRAFT_PAGE_SLUG,
        metaTitle: normalizeEmpty(input.metaTitle),
        metaDescription: normalizeEmpty(input.metaDescription),
        contentJson: normalizeEmpty(input.contentJson),
        isPublished: false,
      },
    });
  }

  async upsertPublishedHomePage(input: {
    companyId: string;
    title: string;
    metaTitle?: string;
    metaDescription?: string;
    contentJson: string;
  }) {
    return this.db.sitePage.upsert({
      where: {
        companyId_slug: {
          companyId: input.companyId,
          slug: SITE_HOME_PAGE_SLUG,
        },
      },
      update: {
        pageKey: SITE_HOME_PAGE_KEY,
        title: input.title,
        metaTitle: normalizeEmpty(input.metaTitle),
        metaDescription: normalizeEmpty(input.metaDescription),
        contentJson: input.contentJson,
        isPublished: true,
      },
      create: {
        companyId: input.companyId,
        pageKey: SITE_HOME_PAGE_KEY,
        title: input.title,
        slug: SITE_HOME_PAGE_SLUG,
        metaTitle: normalizeEmpty(input.metaTitle),
        metaDescription: normalizeEmpty(input.metaDescription),
        contentJson: input.contentJson,
        isPublished: true,
      },
    });
  }

  async createLead(input: {
    companyId: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    subject?: string;
    message?: string;
    requestedService?: string;
  }) {
    return this.db.siteLead.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        email: normalizeEmpty(input.email)?.toLowerCase(),
        phone: normalizeEmpty(input.phone),
        whatsapp: normalizeEmpty(input.whatsapp),
        subject: normalizeEmpty(input.subject),
        message: normalizeEmpty(input.message),
        requestedService: normalizeEmpty(input.requestedService),
      },
    });
  }

  async listLeads(companyId: string, status?: SiteLeadStatus) {
    return this.db.siteLead.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findLeadById(companyId: string, leadId: string) {
    return this.db.siteLead.findFirst({
      where: {
        id: leadId,
        companyId,
      },
    });
  }

  async updateLeadStatus(
    leadId: string,
    status: "NEW" | "CONTACTED" | "CONVERTED" | "ARCHIVED",
  ) {
    return this.db.siteLead.update({
      where: { id: leadId },
      data: { status },
    });
  }

  async updateLeadStatusWithMessage(
    leadId: string,
    status: "NEW" | "CONTACTED" | "CONVERTED" | "ARCHIVED",
    message?: string,
  ) {
    return this.db.siteLead.update({
      where: { id: leadId },
      data: {
        status,
        ...(message ? { message } : {}),
      },
    });
  }
}

function mapSettings(input: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  addressFull?: string;
  isSitePublished?: boolean;
}) {
  return {
    primaryColor: normalizeEmpty(input.primaryColor),
    secondaryColor: normalizeEmpty(input.secondaryColor),
    accentColor: normalizeEmpty(input.accentColor),
    logoUrl: normalizeEmpty(input.logoUrl),
    faviconUrl: normalizeEmpty(input.faviconUrl),
    heroTitle: normalizeEmpty(input.heroTitle),
    heroSubtitle: normalizeEmpty(input.heroSubtitle),
    aboutText: normalizeEmpty(input.aboutText),
    contactEmail: normalizeEmpty(input.contactEmail)?.toLowerCase(),
    contactPhone: normalizeEmpty(input.contactPhone),
    contactWhatsapp: normalizeEmpty(input.contactWhatsapp),
    instagramUrl: normalizeEmpty(input.instagramUrl),
    facebookUrl: normalizeEmpty(input.facebookUrl),
    addressFull: normalizeEmpty(input.addressFull),
    ...(input.isSitePublished !== undefined
      ? { isSitePublished: input.isSitePublished }
      : {}),
  };
}

function normalizeEmpty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
