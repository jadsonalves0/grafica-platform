export type SiteLeadToQuoteInputDto = {
  validUntil?: string;
  discountAmount?: number;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    productId?: string;
  }>;
};
