import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { SiteLeadStatus } from "@prisma/client";
import type { SiteBannerCreateInputDto } from "@/models/dto/site-banner-create-input";
import type { SiteBannerUpdateInputDto } from "@/models/dto/site-banner-update-input";
import type { SiteLeadCreateInputDto } from "@/models/dto/site-lead-create-input";
import type { SiteLeadConvertInputDto } from "@/models/dto/site-lead-convert-input";
import type { SiteLeadConvertOutputDto } from "@/models/dto/site-lead-convert-output";
import type { SiteLeadToQuoteInputDto } from "@/models/dto/site-lead-to-quote-input";
import type { SiteLeadToQuoteOutputDto } from "@/models/dto/site-lead-to-quote-output";
import type { SiteLeadListItemDto } from "@/models/dto/site-lead-list-item";
import type { SiteLeadStatusInputDto } from "@/models/dto/site-lead-status-input";
import type { SitePublicDataDto } from "@/models/dto/site-public-data";
import type { SiteServiceCreateInputDto } from "@/models/dto/site-service-create-input";
import type { SiteServiceUpdateInputDto } from "@/models/dto/site-service-update-input";
import type { SiteSettingsUpdateInputDto } from "@/models/dto/site-settings-update-input";
import {
  createSiteBannerSchema,
  createSiteServiceSchema,
  updateSiteBannerSchema,
  updateSiteServiceSchema,
  updateSiteSettingsSchema,
} from "@/models/validators/site-validator";
import {
  convertSiteLeadSchema as convertLeadSchema,
  leadToQuoteSchema,
  createSiteLeadSchema as createLeadSchema,
  updateSiteLeadStatusSchema as updateLeadStatusSchema,
} from "@/models/validators/site-lead-validator";
import { SiteService } from "@/services/site/site-service";

type SiteContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class SiteController extends BaseController {
  constructor(private readonly siteService: SiteService) {
    super();
  }

  async updateSettings(
    context: SiteContext,
    input: SiteSettingsUpdateInputDto,
  ): Promise<ControllerResult<{ saved: true }>> {
    try {
      const payload = updateSiteSettingsSchema.parse(input);
      await this.siteService.updateSettings(context, payload);
      return this.ok({ saved: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createService(
    context: SiteContext,
    input: SiteServiceCreateInputDto,
  ): Promise<ControllerResult<{ created: true }>> {
    try {
      const payload = createSiteServiceSchema.parse(input);
      await this.siteService.createService(context, payload);
      return this.ok({ created: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createBanner(
    context: SiteContext,
    input: SiteBannerCreateInputDto,
  ): Promise<ControllerResult<{ created: true }>> {
    try {
      const payload = createSiteBannerSchema.parse(input);
      await this.siteService.createBanner(context, payload);
      return this.ok({ created: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateService(
    context: SiteContext,
    companyId: string,
    serviceId: string,
    input: SiteServiceUpdateInputDto,
  ): Promise<ControllerResult<{ updated: true }>> {
    try {
      const payload = updateSiteServiceSchema.parse(input);
      await this.siteService.updateService(context, companyId, serviceId, payload);
      return this.ok({ updated: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async deleteService(
    context: SiteContext,
    companyId: string,
    serviceId: string,
  ): Promise<ControllerResult<{ deleted: true }>> {
    try {
      await this.siteService.deleteService(context, companyId, serviceId);
      return this.ok({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateBanner(
    context: SiteContext,
    companyId: string,
    bannerId: string,
    input: SiteBannerUpdateInputDto,
  ): Promise<ControllerResult<{ updated: true }>> {
    try {
      const payload = updateSiteBannerSchema.parse(input);
      await this.siteService.updateBanner(context, companyId, bannerId, payload);
      return this.ok({ updated: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async deleteBanner(
    context: SiteContext,
    companyId: string,
    bannerId: string,
  ): Promise<ControllerResult<{ deleted: true }>> {
    try {
      await this.siteService.deleteBanner(context, companyId, bannerId);
      return this.ok({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async publicSite(slug: string): Promise<ControllerResult<SitePublicDataDto>> {
    try {
      const data = await this.siteService.getPublicSite(slug);
      return this.ok(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async adminSite(
    context: SiteContext,
    companyId: string,
  ): Promise<ControllerResult<unknown>> {
    try {
      const data = await this.siteService.getAdminSiteData(context, companyId);
      return this.ok(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async createLead(
    input: SiteLeadCreateInputDto,
  ): Promise<ControllerResult<{ created: true }>> {
    try {
      const payload = createLeadSchema.parse(input);
      await this.siteService.createLead(payload);
      return this.ok({ created: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async listLeads(
    context: SiteContext,
    companyId: string,
    status?: SiteLeadStatus,
  ): Promise<ControllerResult<SiteLeadListItemDto[]>> {
    try {
      const leads = await this.siteService.listLeads(context, companyId, status);
      return this.ok(
        leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          subject: lead.subject,
          requestedService: lead.requestedService,
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async updateLeadStatus(
    context: SiteContext,
    companyId: string,
    leadId: string,
    input: SiteLeadStatusInputDto,
  ): Promise<ControllerResult<{ updated: true }>> {
    try {
      const payload = updateLeadStatusSchema.parse(input);
      await this.siteService.updateLeadStatus(context, companyId, leadId, payload);
      return this.ok({ updated: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async convertLead(
    context: SiteContext,
    companyId: string,
    leadId: string,
    input?: SiteLeadConvertInputDto,
  ): Promise<ControllerResult<SiteLeadConvertOutputDto>> {
    try {
      const payload = convertLeadSchema.parse(input ?? {});
      const result = await this.siteService.convertLeadToCustomer(
        context,
        companyId,
        leadId,
        payload,
      );

      return this.ok({
        leadId: result.lead.id,
        customerId: result.customer.id,
        customerName: result.customer.name,
        customerEmail: result.customer.email,
        status: "CONVERTED",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async convertLeadToQuote(
    context: SiteContext,
    companyId: string,
    leadId: string,
    input: SiteLeadToQuoteInputDto,
  ): Promise<ControllerResult<SiteLeadToQuoteOutputDto>> {
    try {
      const payload = leadToQuoteSchema.parse(input);
      const result = await this.siteService.convertLeadToQuote(
        context,
        companyId,
        leadId,
        payload,
      );

      return this.ok({
        leadId: result.lead.id,
        customerId: result.customer.id,
        quoteId: result.quote.id,
        quoteCode: result.quote.code,
        status: "CONTACTED",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}
