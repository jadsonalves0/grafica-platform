export type InventoryMovementListItemDto = {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string | null;
  createdAt: string;
};
