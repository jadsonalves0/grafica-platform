export type InventoryEntryListItemDto = {
  id: string;
  entryType: string;
  supplierName?: string | null;
  documentNumber: string;
  entryDate: string;
  financialCondition: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  itemsCount: number;
  createdAt: string;
  confirmedAt?: string | null;
};
