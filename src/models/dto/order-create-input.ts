import type { OrderItemInputDto } from "@/models/dto/order-item-input";

export type OrderCreateInputDto = {
  companyId: string;
  customerId?: string;
  quoteId?: string;
  deliveryDate?: string;
  notes?: string;
  items?: OrderItemInputDto[];
};
