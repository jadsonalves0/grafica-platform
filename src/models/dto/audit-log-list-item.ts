export type AuditLogListItemDto = {
  id: string;
  entityName: string;
  recordId: string;
  action: string;
  previousData?: string | null;
  newData?: string | null;
  justification?: string | null;
  userName?: string | null;
  createdAt: string;
};
