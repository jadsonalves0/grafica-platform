export type SiteLeadConvertOutputDto = {
  leadId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  status: "CONVERTED";
};
