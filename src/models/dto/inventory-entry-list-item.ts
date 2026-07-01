export type InventoryEntryListItemDto = {
  id: string;
  entryType: string;
  source?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierDocument?: string | null;
  documentNumber: string;
  accessKey?: string | null;
  entryDate: string;
  financialCondition: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  itemsCount: number;
  createdAt: string;
  confirmedAt?: string | null;
};
