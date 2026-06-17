export type InventoryMovementCreateInputDto = {
  companyId: string;
  productId: string;
  movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  quantity: number;
  unitCost?: number;
  referenceType?: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE";
  referenceId?: string;
  notes?: string;
};
