import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { QuoteCreateInputDto } from "@/models/dto/quote-create-input";
import type { QuoteDetailDto } from "@/models/dto/quote-detail";
import type { QuoteListItemDto } from "@/models/dto/quote-list-item";
import type { QuoteUpdateInputDto } from "@/models/dto/quote-update-input";
import { createQuoteSchema, updateQuoteSchema } from "@/models/validators/quote-validator";
import { QuoteService } from "@/services/quotes/quote-service";

type QuoteContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class QuoteController extends BaseController {
  constructor(private readonly quoteService: QuoteService) {
    super();
  }

  async create(
    context: QuoteContext,
    input: QuoteCreateInputDto,
  ): Promise<ControllerResult<QuoteDetailDto>> {
    try {
      const payload = createQuoteSchema.parse(input);
      const quote = await this.quoteService.createQuote(context, payload);
      return this.ok(mapQuoteDetail(quote));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async list(
    context: QuoteContext,
    companyId: string,
    search?: string,
  ): Promise<ControllerResult<QuoteListItemDto[]>> {
    try {
      const quotes = await this.quoteService.listQuotes(context, companyId, search);
      return this.ok(
        quotes.map((quote) => ({
          id: quote.id,
          code: quote.code,
          status: quote.status,
          customerId: quote.customerId,
          customerName: quote.customer.name,
          totalAmount: Number(quote.totalAmount),
          issueDate: quote.issueDate.toISOString(),
          validUntil: quote.validUntil?.toISOString() ?? null,
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async show(
    context: QuoteContext,
    companyId: string,
    quoteId: string,
  ): Promise<ControllerResult<QuoteDetailDto>> {
    try {
      const quote = await this.quoteService.getQuote(context, companyId, quoteId);
      return this.ok(mapQuoteDetail(quote));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async update(
    context: QuoteContext,
    companyId: string,
    quoteId: string,
    input: QuoteUpdateInputDto,
  ): Promise<ControllerResult<QuoteDetailDto>> {
    try {
      const payload = updateQuoteSchema.parse(input);
      const quote = await this.quoteService.updateQuote(context, companyId, quoteId, payload);
      return this.ok(mapQuoteDetail(quote));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async approve(
    context: QuoteContext,
    companyId: string,
    quoteId: string,
  ): Promise<ControllerResult<QuoteDetailDto>> {
    try {
      const quote = await this.quoteService.approveQuote(context, companyId, quoteId);
      return this.ok(mapQuoteDetail(quote));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async delete(
    context: QuoteContext,
    companyId: string,
    quoteId: string,
  ): Promise<ControllerResult<{ deleted: true }>> {
    try {
      await this.quoteService.deleteQuote(context, companyId, quoteId);
      return this.ok({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapQuoteDetail(quote: {
  id: string;
  companyId: string;
  customerId: string;
  customer: {
    name: string;
  };
  code: string;
  status: string;
  issueDate: Date;
  validUntil: Date | null;
  subtotal: { toNumber(): number } | number;
  discountAmount: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string | null;
    description: string;
    quantity: { toNumber(): number } | number;
    unitPrice: { toNumber(): number } | number;
    totalPrice: { toNumber(): number } | number;
  }>;
}): QuoteDetailDto {
  return {
    id: quote.id,
    companyId: quote.companyId,
    customerId: quote.customerId,
    customerName: quote.customer.name,
    code: quote.code,
    status: quote.status,
    issueDate: quote.issueDate.toISOString(),
    validUntil: quote.validUntil?.toISOString() ?? null,
    subtotal: toNumber(quote.subtotal),
    discountAmount: toNumber(quote.discountAmount),
    totalAmount: toNumber(quote.totalAmount),
    notes: quote.notes,
    items: quote.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
    })),
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
  };
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}
