export type InventoryEntryImportXmlInputDto = {
  companyId: string;
  xmlContent: string;
  fileName?: string;
  mimeType?: string;
};
