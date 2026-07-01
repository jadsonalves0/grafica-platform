import { z } from "zod";
import {
  isValidGtin,
  normalizeReferenceInput,
  normalizeGtinInput,
  normalizeSkuInput,
  normalizeUnitInput,
} from "@/lib/forms/br-utils";

export const createInventoryProductSchema = z.object({
  companyId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(200),
  sku: z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const normalized = normalizeSkuInput(value);
        return normalized === "" ? undefined : normalized;
      },
      z.string().max(40).optional(),
    ),
  barcode: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = normalizeGtinInput(value);
      return normalized === "" ? undefined : normalized;
    },
    z
      .string()
      .refine((value) => isValidGtin(value), "Informe um EAN/GTIN valido.")
      .optional(),
  ),
  unit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().min(1, "Informe a unidade.").max(12)),
  type: z.enum(["RAW_MATERIAL", "SERVICE", "FINISHED_PRODUCT", "RESALE"]),
  controlsStock: z.boolean().optional(),
  showOnWebsite: z.boolean().optional(),
  desiredMargin: z.coerce.number().min(0).max(99.99).optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  minimumStock: z.coerce.number().nonnegative().optional(),
});

export const updateInventoryProductSchema = createInventoryProductSchema.omit({
  companyId: true,
});

export const createInventoryMovementSchema = z.object({
  companyId: z.string().uuid(),
  productId: z.string().uuid(),
  movementType: z.enum(["INPUT", "OUTPUT", "ADJUSTMENT"]),
  reasonCode: z
    .enum([
      "ADJUSTMENT_POSITIVE",
      "ADJUSTMENT_NEGATIVE",
      "LOSS",
      "DAMAGE",
      "INTERNAL_CONSUMPTION",
      "SAMPLE",
      "DIVERSE_INPUT",
      "DIVERSE_OUTPUT",
      "INITIAL_BALANCE",
      "BONUS",
      "RETURN",
    ])
    .optional(),
  reasonText: z.string().max(255).optional().or(z.literal("")),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().optional(),
  referenceType: z.enum(["MANUAL", "QUOTE", "ORDER", "PURCHASE", "ENTRY", "PRODUCTION"]).optional(),
  referenceId: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = normalizeReferenceInput(value);
      return normalized === "" ? undefined : normalized;
    },
    z.string().max(80).optional(),
  ),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const inventoryEntryItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  description: z.string().trim().min(2).max(255),
  unit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().min(1, "Informe a unidade.").max(12)),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
  priceDecision: z.enum(["KEEP_CURRENT", "APPLY_SUGGESTED", "CUSTOM_PRICE"]).optional(),
  decisionJustification: z.string().max(1000).optional().or(z.literal("")),
  customSalePrice: z.coerce.number().nonnegative().optional(),
});

export const createInventoryEntrySchema = z.object({
  companyId: z.string().uuid(),
  entryType: z.enum([
    "PURCHASE_INVOICE",
    "PURCHASE_WITHOUT_INVOICE",
    "INITIAL_BALANCE",
    "RETURN",
    "BONUS",
    "OTHER",
  ]),
  supplierId: z.string().uuid().optional(),
  supplierDocument: z.string().trim().max(30).optional().or(z.literal("")),
  supplierName: z.string().trim().max(200).optional().or(z.literal("")),
  documentNumber: z.string().trim().min(1).max(80),
  entryDate: z.string(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  financialCondition: z.enum(["NONE", "CASH", "TERM"]).optional(),
  financialAccountId: z.string().uuid().optional(),
  installmentCount: z.coerce.number().int().min(1).max(24).optional(),
  firstDueDate: z.string().optional(),
  items: z.array(inventoryEntryItemSchema).min(1),
});

export const updateInventoryEntrySchema = createInventoryEntrySchema.omit({
  companyId: true,
});

export const confirmInventoryEntrySchema = z.object({
  justification: z.string().max(1000).optional().or(z.literal("")),
});

export const cancelInventoryEntrySchema = z.object({
  justification: z.string().trim().min(5).max(1000),
});

export const importInventoryEntryXmlSchema = z.object({
  companyId: z.string().uuid(),
  xmlContent: z.string().trim().min(20),
  fileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(120).optional(),
});

export const matchInventoryEntryItemSchema = z.object({
  internalItemId: z.string().uuid(),
  saveSupplierMapping: z.boolean().optional(),
  purchaseUnit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().max(20))
    .optional()
    .or(z.literal("")),
  stockUnit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().max(20))
    .optional()
    .or(z.literal("")),
  conversionFactor: z.coerce.number().positive().optional(),
  confidence: z.coerce.number().min(0).max(100).optional(),
});

export const createInventoryEntryItemProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(200),
  sku: z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const normalized = normalizeSkuInput(value);
        return normalized === "" ? undefined : normalized;
      },
      z.string().max(40).optional(),
    ),
  barcode: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = normalizeGtinInput(value);
      return normalized === "" ? undefined : normalized;
    },
    z
      .string()
      .refine((value) => isValidGtin(value), "Informe um EAN/GTIN valido.")
      .optional(),
  ),
  type: z.enum(["RAW_MATERIAL", "SERVICE", "FINISHED_PRODUCT", "RESALE"]),
  unit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().min(1, "Informe a unidade.").max(12)),
  controlsStock: z.boolean().optional(),
  desiredMargin: z.coerce.number().min(0).max(99.99).optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  minimumStock: z.coerce.number().nonnegative().optional(),
  saveSupplierMapping: z.boolean().optional(),
  purchaseUnit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().max(20))
    .optional()
    .or(z.literal("")),
  stockUnit: z
    .string()
    .transform((value) => normalizeUnitInput(value))
    .pipe(z.string().max(20))
    .optional()
    .or(z.literal("")),
  conversionFactor: z.coerce.number().positive().optional(),
  confidence: z.coerce.number().min(0).max(100).optional(),
});

export const createInventoryGroupSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(2, "Informe o nome do grupo.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  defaultMargin: z.coerce.number().min(0).max(99.99).optional(),
  showOnWebsite: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateInventoryGroupSchema = createInventoryGroupSchema.omit({
  companyId: true,
});

export const createInventoryPurchaseListEntrySchema = z.object({
  companyId: z.string().uuid(),
  productIds: z.array(z.string().uuid()).min(1, "Selecione pelo menos um item."),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().trim().max(200).optional().or(z.literal("")),
  supplierDocument: z.string().trim().max(30).optional().or(z.literal("")),
});
