export type CompanyOperationalSettingsUpdateInputDto = {
  companyId: string;
  defaultMarginPercent: number;
  minimumMarginPercent: number;
  costVariationAlertPercent: number;
  regularDiscountLimitPercent: number;
  managerDiscountLimitPercent: number;
  allowNegativeStock: boolean;
};
