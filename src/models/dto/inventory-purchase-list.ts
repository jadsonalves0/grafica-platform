import type { InventoryPurchaseSuggestionListItemDto } from "@/models/dto/inventory-purchase-suggestion-list-item";

export type InventoryPurchaseListGroupDto = {
  supplierId?: string | null;
  supplierName: string;
  supplierDocument?: string | null;
  hasMappedSupplier: boolean;
  itemsCount: number;
  estimatedPurchaseValue: number;
  items: InventoryPurchaseSuggestionListItemDto[];
};

export type InventoryPurchaseListDto = {
  generatedAt: string;
  selectionMode: "FILTERED" | "SELECTED";
  totalItems: number;
  totalGroups: number;
  estimatedPurchaseValue: number;
  missingSupplierItems: number;
  mismatchedItems: number;
  filters: {
    search?: string | null;
    categoryId?: string | null;
    productIds: string[];
  };
  groups: InventoryPurchaseListGroupDto[];
};
