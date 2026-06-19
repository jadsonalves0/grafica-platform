export type InventoryMovementCreateInputDto = {
  companyId: string;
  productId: string;
  movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  reasonCode?:
    | "ADJUSTMENT_POSITIVE"
    | "ADJUSTMENT_NEGATIVE"
    | "LOSS"
    | "DAMAGE"
    | "INTERNAL_CONSUMPTION"
    | "SAMPLE"
    | "DIVERSE_INPUT"
    | "DIVERSE_OUTPUT"
    | "INITIAL_BALANCE"
    | "BONUS"
    | "RETURN";
  reasonText?: string;
  quantity: number;
  unitCost?: number;
  referenceType?: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE" | "ENTRY" | "PRODUCTION";
  referenceId?: string;
  notes?: string;
};
