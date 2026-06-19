export type CompanyOperationalSettingsDetailDto = {
  companyId: string;
  defaultMarginPercent: number;
  minimumMarginPercent: number;
  costVariationAlertPercent: number;
  regularDiscountLimitPercent: number;
  managerDiscountLimitPercent: number;
  allowNegativeStock: boolean;
  createdAt: string;
  updatedAt: string;
};
