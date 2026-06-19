export type InventoryMovementListItemDto = {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  status: string;
  reasonCode?: string | null;
  reasonText?: string | null;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  occurredAt: string;
  createdAt: string;
};
