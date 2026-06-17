export type QuoteListItemDto = {
  id: string;
  code: string;
  status: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  issueDate: string;
  validUntil?: string | null;
};
