export type OrderStatusUpdateInputDto = {
  status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  productionStatus?:
    | "PENDING"
    | "IN_PRODUCTION"
    | "WAITING_APPROVAL"
    | "READY"
    | "DELIVERED";
};
