export type SiteLeadToQuoteOutputDto = {
  leadId: string;
  customerId: string;
  quoteId: string;
  quoteCode: string;
  status: "CONTACTED" | "CONVERTED";
};
