export type FinancialAccountCreateInputDto = {
  companyId: string;
  name: string;
  type: "CASH" | "BANK" | "DIGITAL_WALLET";
  initialBalance?: number;
};
