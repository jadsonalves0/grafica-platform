import type { QuoteItemInputDto } from "@/models/dto/quote-item-input";

export type QuoteCreateInputDto = {
  companyId: string;
  customerId: string;
  validUntil?: string;
  discountAmount?: number;
  notes?: string;
  items: QuoteItemInputDto[];
};
