import type { InventoryEntryDetailDto } from "@/models/dto/inventory-entry-detail";
import type { InventoryProductListItemDto } from "@/models/dto/inventory-product-list-item";

export type InventoryEntryItemCreateProductResultDto = {
  entry: InventoryEntryDetailDto;
  product: InventoryProductListItemDto;
};
