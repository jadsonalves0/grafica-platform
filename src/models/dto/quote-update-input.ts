import type { QuoteItemInputDto } from "@/models/dto/quote-item-input";

export type QuoteUpdateInputDto = {
  validUntil?: string;
  discountAmount?: number;
  notes?: string;
  items: QuoteItemInputDto[];
};
