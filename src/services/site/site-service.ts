import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
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

    return this.siteRepository.upsertSettings(input);
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

    if (!company) {
      throw new Error("Public site not found.");
    }

    return {
      company: {
        id: company.id,
        tradeName: company.tradeName,
        slug: company.slug,
      },
      settings: company.siteSettings
        ? {
            primaryColor: company.siteSettings.primaryColor,
            secondaryColor: company.siteSettings.secondaryColor,
            accentColor: company.siteSettings.accentColor,
            logoUrl: company.siteSettings.logoUrl,
            heroTitle: company.siteSettings.heroTitle,
            heroSubtitle: company.siteSettings.heroSubtitle,
            aboutText: company.siteSettings.aboutText,
            contactEmail: company.siteSettings.contactEmail,
            contactPhone: company.siteSettings.contactPhone,
            contactWhatsapp: company.siteSettings.contactWhatsapp,
            instagramUrl: company.siteSettings.instagramUrl,
            facebookUrl: company.siteSettings.facebookUrl,
            addressFull: company.siteSettings.addressFull,
            isSitePublished: company.siteSettings.isSitePublished,
          }
        : null,
      services: company.siteServices.map((service) => ({
        id: service.id,
        title: service.title,
        shortDescription: service.shortDescription,
        imageUrl: service.imageUrl,
      })),
      banners: company.siteBanners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        ctaLabel: banner.ctaLabel,
        ctaLink: banner.ctaLink,
      })),
    };
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
