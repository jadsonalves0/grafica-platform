DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementStatus') THEN
    CREATE TYPE "StockMovementStatus" AS ENUM ('CONFIRMED', 'REVERSED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementReasonCode') THEN
    CREATE TYPE "StockMovementReasonCode" AS ENUM (
      'ENTRY_CONFIRMATION',
      'ENTRY_REVERSAL',
      'PRODUCTION_CONSUMPTION',
      'PRODUCTION_OUTPUT',
      'PRODUCTION_REVERSAL',
      'ADJUSTMENT_POSITIVE',
      'ADJUSTMENT_NEGATIVE',
      'LOSS',
      'DAMAGE',
      'INTERNAL_CONSUMPTION',
      'SAMPLE',
      'DIVERSE_INPUT',
      'DIVERSE_OUTPUT',
      'INITIAL_BALANCE',
      'BONUS',
      'RETURN'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryEntryType') THEN
    CREATE TYPE "InventoryEntryType" AS ENUM (
      'PURCHASE_INVOICE',
      'PURCHASE_WITHOUT_INVOICE',
      'INITIAL_BALANCE',
      'RETURN',
      'BONUS',
      'OTHER'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryEntryStatus') THEN
    CREATE TYPE "InventoryEntryStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinancialCondition') THEN
    CREATE TYPE "FinancialCondition" AS ENUM ('NONE', 'CASH', 'TERM');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinancialOriginType') THEN
    CREATE TYPE "FinancialOriginType" AS ENUM ('MANUAL', 'ENTRY', 'PRODUCTION', 'ORDER', 'QUOTE', 'WEBSITE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionExecutionStatus') THEN
    CREATE TYPE "ProductionExecutionStatus" AS ENUM ('PENDING', 'IN_PRODUCTION', 'COMPLETED', 'CANCELED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    CREATE TYPE "AuditAction" AS ENUM (
      'CREATE',
      'UPDATE',
      'CONFIRM',
      'CANCEL',
      'REVERSE',
      'OVERRIDE'
    );
  END IF;
END
$$;

ALTER TYPE "FinancialEntryType" ADD VALUE IF NOT EXISTS 'RECEIVABLE';
ALTER TYPE "FinancialEntryType" ADD VALUE IF NOT EXISTS 'PAYABLE';
ALTER TYPE "FinancialEntryType" ADD VALUE IF NOT EXISTS 'TRANSFER';

ALTER TYPE "StockReferenceType" ADD VALUE IF NOT EXISTS 'ENTRY';
ALTER TYPE "StockReferenceType" ADD VALUE IF NOT EXISTS 'PRODUCTION';

CREATE TABLE IF NOT EXISTS "company_operational_settings" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "default_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 30,
  "minimum_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "cost_variation_alert_percent" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "regular_discount_limit_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
  "manager_discount_limit_percent" DECIMAL(5,2) NOT NULL DEFAULT 15,
  "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_operational_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_operational_settings_company_id_key"
ON "company_operational_settings"("company_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_operational_settings_company_id_fkey'
  ) THEN
    ALTER TABLE "company_operational_settings"
      ADD CONSTRAINT "company_operational_settings_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "inventory_entries" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "entry_type" "InventoryEntryType" NOT NULL,
  "supplier_name" VARCHAR(200),
  "document_number" VARCHAR(80) NOT NULL,
  "entry_date" DATE NOT NULL,
  "notes" TEXT,
  "status" "InventoryEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "financial_condition" "FinancialCondition" NOT NULL DEFAULT 'NONE',
  "financial_account_id" UUID,
  "installment_count" INTEGER NOT NULL DEFAULT 1,
  "first_due_date" DATE,
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "confirmed_at" TIMESTAMP(3),
  "confirmed_by_user_id" UUID,
  "canceled_at" TIMESTAMP(3),
  "canceled_by_user_id" UUID,
  "cancel_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_entries_company_type_document_key"
ON "inventory_entries"("company_id", "supplier_name", "entry_type", "document_number");

CREATE INDEX IF NOT EXISTS "inventory_entries_company_id_status_entry_date_idx"
ON "inventory_entries"("company_id", "status", "entry_date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_entries_company_id_fkey') THEN
    ALTER TABLE "inventory_entries"
      ADD CONSTRAINT "inventory_entries_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_entries_financial_account_id_fkey') THEN
    ALTER TABLE "inventory_entries"
      ADD CONSTRAINT "inventory_entries_financial_account_id_fkey"
      FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_entries_confirmed_by_user_id_fkey') THEN
    ALTER TABLE "inventory_entries"
      ADD CONSTRAINT "inventory_entries_confirmed_by_user_id_fkey"
      FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_entries_canceled_by_user_id_fkey') THEN
    ALTER TABLE "inventory_entries"
      ADD CONSTRAINT "inventory_entries_canceled_by_user_id_fkey"
      FOREIGN KEY ("canceled_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "inventory_entry_items" (
  "id" UUID NOT NULL,
  "inventory_entry_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "previous_cost_price" DECIMAL(12,2),
  "previous_sale_price" DECIMAL(12,2),
  "suggested_sale_price" DECIMAL(12,2),
  "estimated_margin_percent" DECIMAL(5,2),
  "price_decision" VARCHAR(40),
  "decision_justification" TEXT,
  "custom_sale_price" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_entry_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_entry_items_inventory_entry_id_idx"
ON "inventory_entry_items"("inventory_entry_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_entry_items_inventory_entry_id_fkey') THEN
    ALTER TABLE "inventory_entry_items"
      ADD CONSTRAINT "inventory_entry_items_inventory_entry_id_fkey"
      FOREIGN KEY ("inventory_entry_id") REFERENCES "inventory_entries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_entry_items_product_id_fkey') THEN
    ALTER TABLE "inventory_entry_items"
      ADD CONSTRAINT "inventory_entry_items_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "stock_layers" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "inventory_entry_id" UUID,
  "stock_movement_id" UUID NOT NULL,
  "entry_date" TIMESTAMP(3) NOT NULL,
  "original_quantity" DECIMAL(12,3) NOT NULL,
  "available_quantity" DECIMAL(12,3) NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_layers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_layers_stock_movement_id_key"
ON "stock_layers"("stock_movement_id");

CREATE INDEX IF NOT EXISTS "stock_layers_company_id_product_id_entry_date_idx"
ON "stock_layers"("company_id", "product_id", "entry_date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layers_company_id_fkey') THEN
    ALTER TABLE "stock_layers"
      ADD CONSTRAINT "stock_layers_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layers_product_id_fkey') THEN
    ALTER TABLE "stock_layers"
      ADD CONSTRAINT "stock_layers_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layers_inventory_entry_id_fkey') THEN
    ALTER TABLE "stock_layers"
      ADD CONSTRAINT "stock_layers_inventory_entry_id_fkey"
      FOREIGN KEY ("inventory_entry_id") REFERENCES "inventory_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layers_stock_movement_id_fkey') THEN
    ALTER TABLE "stock_layers"
      ADD CONSTRAINT "stock_layers_stock_movement_id_fkey"
      FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "stock_layer_consumptions" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "stock_movement_id" UUID NOT NULL,
  "stock_layer_id" UUID NOT NULL,
  "quantity_consumed" DECIMAL(12,3) NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "total_cost" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_layer_consumptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_layer_consumptions_company_id_product_id_created_at_idx"
ON "stock_layer_consumptions"("company_id", "product_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layer_consumptions_company_id_fkey') THEN
    ALTER TABLE "stock_layer_consumptions"
      ADD CONSTRAINT "stock_layer_consumptions_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layer_consumptions_product_id_fkey') THEN
    ALTER TABLE "stock_layer_consumptions"
      ADD CONSTRAINT "stock_layer_consumptions_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layer_consumptions_stock_movement_id_fkey') THEN
    ALTER TABLE "stock_layer_consumptions"
      ADD CONSTRAINT "stock_layer_consumptions_stock_movement_id_fkey"
      FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_layer_consumptions_stock_layer_id_fkey') THEN
    ALTER TABLE "stock_layer_consumptions"
      ADD CONSTRAINT "stock_layer_consumptions_stock_layer_id_fkey"
      FOREIGN KEY ("stock_layer_id") REFERENCES "stock_layers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "user_id" UUID,
  "entity_name" VARCHAR(80) NOT NULL,
  "record_id" VARCHAR(80) NOT NULL,
  "action" "AuditAction" NOT NULL,
  "previous_data" TEXT,
  "new_data" TEXT,
  "justification" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_company_id_entity_name_created_at_idx"
ON "audit_logs"("company_id", "entity_name", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_company_id_fkey') THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "stock_movements"
  ADD COLUMN IF NOT EXISTS "status" "StockMovementStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS "reason_code" "StockMovementReasonCode",
  ADD COLUMN IF NOT EXISTS "reason_text" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "inventory_entry_id" UUID,
  ADD COLUMN IF NOT EXISTS "production_record_id" UUID,
  ADD COLUMN IF NOT EXISTS "reversed_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "occurred_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3);

UPDATE "stock_movements"
SET "occurred_at" = COALESCE("occurred_at", "created_at")
WHERE "occurred_at" IS NULL;

ALTER TABLE "stock_movements"
  ALTER COLUMN "occurred_at" SET NOT NULL,
  ALTER COLUMN "occurred_at" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'reference_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE "stock_movements"
      ALTER COLUMN "reference_id" TYPE VARCHAR(80)
      USING "reference_id"::text;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_inventory_entry_id_fkey') THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_inventory_entry_id_fkey"
      FOREIGN KEY ("inventory_entry_id") REFERENCES "inventory_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_production_record_id_fkey') THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_production_record_id_fkey"
      FOREIGN KEY ("production_record_id") REFERENCES "production_records"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_reversed_by_user_id_fkey') THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_reversed_by_user_id_fkey"
      FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "stock_movements_company_id_product_id_occurred_at_idx"
ON "stock_movements"("company_id", "product_id", "occurred_at");

ALTER TABLE "financial_entries"
  ADD COLUMN IF NOT EXISTS "inventory_entry_id" UUID,
  ADD COLUMN IF NOT EXISTS "origin_type" "FinancialOriginType" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "supplier_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "installment_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "installment_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3);

UPDATE "financial_entries"
SET "origin_type" = 'MANUAL'
WHERE "origin_type" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_entries_inventory_entry_id_fkey') THEN
    ALTER TABLE "financial_entries"
      ADD CONSTRAINT "financial_entries_inventory_entry_id_fkey"
      FOREIGN KEY ("inventory_entry_id") REFERENCES "inventory_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "financial_entries_company_id_entry_type_status_due_date_idx"
ON "financial_entries"("company_id", "entry_type", "status", "due_date");

ALTER TABLE "production_records"
  ADD COLUMN IF NOT EXISTS "order_id" UUID,
  ADD COLUMN IF NOT EXISTS "quantity_planned" DECIMAL(12,3),
  ADD COLUMN IF NOT EXISTS "loss_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "status" "ProductionExecutionStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "responsible_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_order_id_fkey') THEN
    ALTER TABLE "production_records"
      ADD CONSTRAINT "production_records_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_responsible_user_id_fkey') THEN
    ALTER TABLE "production_records"
      ADD CONSTRAINT "production_records_responsible_user_id_fkey"
      FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
