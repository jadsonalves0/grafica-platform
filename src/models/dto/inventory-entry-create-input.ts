import type { InventoryEntryItemInputDto } from "@/models/dto/inventory-entry-item-input";

export type InventoryEntryCreateInputDto = {
  companyId: string;
  entryType:
    | "PURCHASE_INVOICE"
    | "PURCHASE_WITHOUT_INVOICE"
    | "INITIAL_BALANCE"
    | "RETURN"
    | "BONUS"
    | "OTHER";
  supplierId?: string;
  supplierDocument?: string;
  supplierName?: string;
  documentNumber: string;
  entryDate: string;
  notes?: string;
  financialCondition?: "NONE" | "CASH" | "TERM";
  financialAccountId?: string;
  installmentCount?: number;
  firstDueDate?: string;
  items: InventoryEntryItemInputDto[];
};
