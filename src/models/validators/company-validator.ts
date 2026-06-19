import { z } from "zod";

export const companyIdSchema = z.string().uuid();

export const updateCompanyOperationalSettingsSchema = z.object({
  companyId: z.string().uuid(),
  defaultMarginPercent: z.coerce.number().min(0).max(99.99),
  minimumMarginPercent: z.coerce.number().min(0).max(99.99),
  costVariationAlertPercent: z.coerce.number().min(0).max(99.99),
  regularDiscountLimitPercent: z.coerce.number().min(0).max(99.99),
  managerDiscountLimitPercent: z.coerce.number().min(0).max(99.99),
  allowNegativeStock: z.boolean(),
});
