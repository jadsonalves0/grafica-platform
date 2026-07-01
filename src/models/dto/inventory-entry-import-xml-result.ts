export type InventoryEntryImportXmlResultDto = {
  draftEntryId: string;
  document: {
    accessKey?: string | null;
    number: string;
    series?: string | null;
    issuedAt?: string | null;
    supplierName?: string | null;
    supplierDocument?: string | null;
    totalAmount: number;
    protocol?: string | null;
  };
  items: Array<{
    entryItemId: string;
    lineNumber?: number | null;
    supplierProductCode?: string | null;
    description: string;
    ean?: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    matchedItemId?: string | null;
    matchedItemName?: string | null;
    matchStatus: string;
    matchConfidence: number;
    warnings: string[];
  }>;
  warnings: string[];
};
