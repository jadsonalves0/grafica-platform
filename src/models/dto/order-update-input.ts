import type { OrderItemInputDto } from "@/models/dto/order-item-input";

export type OrderUpdateInputDto = {
  deliveryDate?: string;
  notes?: string;
  items: OrderItemInputDto[];
};
