import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import {
  composeDraftSitePublicData,
  getSiteMetaDescription,
  getSiteMetaTitle,
  normalizeSiteHomeContent,
  parsePublishedSiteSnapshot,
  stringifySiteHomeContent,
} from "@/lib/site/site-home";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { SiteLeadStatus } from "@prisma/client";
import type { SiteBannerCreateInputDto } from "@/models/dto/site-banner-create-input";
import type { SiteBannerUpdateInputDto } from "@/models/dto/site-banner-update-input";
import type { SiteLeadCreateInputDto } from "@/models/dto/site-lead-create-input";
import type { SiteLeadConvertInputDto } from "@/models/dto/site-lead-convert-input";
import type { SiteLeadToQuoteInputDto } from "@/models/dto/site-lead-to-quote-input";
import type { SiteLeadStatusInputDto } from "@/models/dto/site-lead-status-input";
import type { SitePublicDataDto } from "@/models/dto/site-public-data";
import type { SiteServiceCreateInputDto } from "@/models/dto/site-service-create-input";
import type { SiteServiceUpdateInputDto } from "@/models/dto/site-service-update-input";
import type { SiteSettingsUpdateInputDto } from "@/models/dto/site-settings-update-input";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { SiteRepository } from "@/repositories/site/site-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class SiteService extends BaseService {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async updateSettings(
    context: TenantContext & { permissions: string[] },
    input: SiteSettingsUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only update site settings inside your company.");
    }

    const company = await this.companyRepository.findById(input.companyId);

    if (!company) {
      throw new Error("Company not found.");
    }

    const savedSettings = await this.siteRepository.upsertSettings({
      ...input,
      isSitePublished:
        input.publicationAction === "publish"
          ? true
          : input.publicationAction === "saveDraft"
            ? undefined
            : input.isSitePublished,
    });

    const homeContent = normalizeSiteHomeContent(input.homeContent);

    await this.siteRepository.upsertDraftHomePage({
      companyId: input.companyId,
      title: savedSettings.heroTitle?.trim() || company.tradeName,
      metaTitle: homeContent.metaTitle,
      metaDescription: homeContent.metaDescription,
      contentJson: stringifySiteHomeContent(homeContent),
    });

    if (input.publicationAction === "publish") {
      const draftSite = await this.siteRepository.getAdminSiteData(input.companyId);

      if (!draftSite) {
        throw new Error("Company not found.");
      }

      const hasActiveService = draftSite.siteServices.some((service) => service.isActive);
      const hasContact =
        Boolean(savedSettings.contactEmail) ||
        Boolean(savedSettings.contactPhone) ||
        Boolean(savedSettings.contactWhatsapp);

      if (!savedSettings.heroTitle?.trim()) {
        throw new Error("Preencha o titulo principal antes de publicar.");
      }

      if (!hasContact) {
        throw new Error("Configure pelo menos um canal de contato antes de publicar.");
      }

      if (!hasActiveService) {
        throw new Error("Ative pelo menos um servico antes de publicar o site.");
      }

      const snapshot = composeDraftSitePublicData({
        company: {
          id: company.id,
          tradeName: company.tradeName,
          slug: company.slug,
        },
        settings: savedSettings,
        services: draftSite.siteServices,
        banners: draftSite.siteBanners,
        homeContent,
        isPublished: true,
      });

      await this.siteRepository.upsertPublishedHomePage({
        companyId: input.companyId,
        title: savedSettings.heroTitle?.trim() || company.tradeName,
        metaTitle: getSiteMetaTitle(snapshot),
        metaDescription: getSiteMetaDescription(snapshot),
        contentJson: JSON.stringify(snapshot),
      });
    }

    return savedSettings;
  }

  async createService(
    context: TenantContext & { permissions: string[] },
    input: SiteServiceCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only update site services inside your company.");
    }

    return this.siteRepository.createService({
      ...input,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  async createBanner(
    context: TenantContext & { permissions: string[] },
    input: SiteBannerCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only update site banners inside your company.");
    }

    return this.siteRepository.createBanner({
      ...input,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  async updateService(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    serviceId: string,
    input: SiteServiceUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update site services inside your company.");
    }

    const service = await this.siteRepository.findServiceById(companyId, serviceId);

    if (!service) {
      throw new Error("Service not found.");
    }

    return this.siteRepository.updateService(serviceId, input);
  }

  async deleteService(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    serviceId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only delete site services inside your company.");
    }

    const service = await this.siteRepository.findServiceById(companyId, serviceId);

    if (!service) {
      throw new Error("Service not found.");
    }

    await this.siteRepository.deleteService(serviceId);
  }

  async updateBanner(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    bannerId: string,
    input: SiteBannerUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update site banners inside your company.");
    }

    const banner = await this.siteRepository.findBannerById(companyId, bannerId);

    if (!banner) {
      throw new Error("Banner not found.");
    }

    return this.siteRepository.updateBanner(bannerId, input);
  }

  async deleteBanner(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    bannerId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only delete site banners inside your company.");
    }

    const banner = await this.siteRepository.findBannerById(companyId, bannerId);

    if (!banner) {
      throw new Error("Banner not found.");
    }

    await this.siteRepository.deleteBanner(bannerId);
  }

  async getPublicSite(slug: string): Promise<SitePublicDataDto> {
    const company = await this.siteRepository.getPublicSiteBySlug(slug);

    if (!company || !company.siteSettings?.isSitePublished) {
      throw new Error("Public site not found.");
    }

    const publishedSnapshot = parsePublishedSiteSnapshot(company.sitePages[0]?.contentJson);

    if (publishedSnapshot) {
      return publishedSnapshot;
    }

    return composeDraftSitePublicData({
      company: {
        id: company.id,
        tradeName: company.tradeName,
        slug: company.slug,
      },
      settings: company.siteSettings,
      services: company.siteServices,
      banners: company.siteBanners,
      isPublished: true,
    });
  }

  async getAdminSiteData(
    context: TenantContext & { permissions: string[] },
    companyId: string,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view site data inside your company.");
    }

    const company = await this.siteRepository.getAdminSiteData(companyId);

    if (!company) {
      throw new Error("Company not found.");
    }

    return company;
  }

  async createLead(input: SiteLeadCreateInputDto) {
    const company = await this.companyRepository.findById(input.companyId);

    if (!company) {
      throw new Error("Company not found.");
    }

    return this.siteRepository.createLead(input);
  }

  async listLeads(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    status?: SiteLeadStatus,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteView);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view site leads inside your company.");
    }

    return this.siteRepository.listLeads(companyId, status);
  }

  async updateLeadStatus(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    leadId: string,
    input: SiteLeadStatusInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.siteUpdate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update site leads inside your company.");
    }

    const lead = await this.siteRepository.findLeadById(companyId, leadId);

    if (!lead) {
      throw new Error("Lead not found.");
    }

    return this.siteRepository.updateLeadStatus(leadId, input.status);
  }

  async convertLeadToCustomer(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    leadId: string,
    input?: SiteLeadConvertInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.customersCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only convert leads inside your company.");
    }

    const lead = await this.siteRepository.findLeadById(companyId, leadId);

    if (!lead) {
      throw new Error("Lead not found.");
    }

    if (lead.status === "CONVERTED") {
      throw new Error("Lead has already been converted.");
    }

    if (lead.email) {
      const existingCustomer = await this.customerRepository.findByEmail(companyId, lead.email);

      if (existingCustomer) {
        await this.siteRepository.updateLeadStatusWithMessage(
          lead.id,
          "CONVERTED",
          input?.notes?.trim() || lead.message || undefined,
        );

        return {
          lead,
          customer: existingCustomer,
        };
      }
    }

    const customer = await this.customerRepository.create({
      companyId,
      name: lead.name,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      whatsapp: lead.whatsapp ?? undefined,
      notes: input?.notes?.trim() || lead.message || undefined,
    });

    await this.siteRepository.updateLeadStatusWithMessage(
      lead.id,
      "CONVERTED",
      input?.notes?.trim() || lead.message || undefined,
    );

    return {
      lead,
      customer,
    };
  }

  async convertLeadToQuote(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    leadId: string,
    input: SiteLeadToQuoteInputDto,
  ) {
    const tenantContext = this.requireContext(context);
    this.authorizationService.ensurePermission(context.permissions, PERMISSIONS.quotesCreate);

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only convert leads into quotes inside your company.");
    }

    const lead = await this.siteRepository.findLeadById(companyId, leadId);

    if (!lead) {
      throw new Error("Lead not found.");
    }

    let customer = lead.email
      ? await this.customerRepository.findByEmail(companyId, lead.email)
      : null;

    if (!customer) {
      customer = await this.customerRepository.create({
        companyId,
        name: lead.name,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        whatsapp: lead.whatsapp ?? undefined,
        notes: input.notes?.trim() || lead.message || undefined,
      });
    }

    const pricing = calculateLeadQuotePricing(input.items, input.discountAmount ?? 0);
    const count = await this.quoteRepository.countByCompany(companyId);

    const quote = await this.quoteRepository.create({
      companyId,
      customerId: customer.id,
      code: `ORC-${String(count + 1).padStart(6, "0")}`,
      issueDate: new Date(),
      validUntil: parseOptionalDate(input.validUntil),
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      notes: input.notes?.trim() || lead.message || undefined,
      createdByUserId: tenantContext.userId,
      items: pricing.items,
    });

    await this.siteRepository.updateLeadStatusWithMessage(
      lead.id,
      "CONTACTED",
      input.notes?.trim() || lead.message || undefined,
    );

    return {
      lead,
      customer,
      quote,
    };
  }
}

function calculateLeadQuotePricing(
  items: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>,
  discountAmount: number,
) {
  const normalizedItems = items.map((item) => {
    const totalPrice = roundCurrency(item.quantity * item.unitPrice);

    return {
      productId: item.productId,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: roundCurrency(item.unitPrice),
      totalPrice,
    };
  });

  const subtotal = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0),
  );
  const normalizedDiscount = roundCurrency(discountAmount);

  if (normalizedDiscount > subtotal) {
    throw new Error("Discount cannot be greater than subtotal.");
  }

  return {
    items: normalizedItems,
    subtotal,
    discountAmount: normalizedDiscount,
    totalAmount: roundCurrency(subtotal - normalizedDiscount),
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function parseOptionalDate(value?: string) {
  if (!value) return undefined;

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid validity date.");
  }

  return parsedDate;
}
