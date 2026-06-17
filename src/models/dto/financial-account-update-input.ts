export type FinancialAccountUpdateInputDto = {
  name: string;
  type: "CASH" | "BANK" | "DIGITAL_WALLET";
  initialBalance?: number;
};
