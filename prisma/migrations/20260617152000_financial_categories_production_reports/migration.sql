CREATE TABLE "financial_categories" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "entry_type" "FinancialEntryType" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_categories_company_id_entry_type_name_key"
ON "financial_categories"("company_id", "entry_type", "name");

ALTER TABLE "financial_categories"
ADD CONSTRAINT "financial_categories_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_entries"
ADD COLUMN "financial_category_id" UUID;

ALTER TABLE "financial_entries"
ADD CONSTRAINT "financial_entries_financial_category_id_fkey"
FOREIGN KEY ("financial_category_id") REFERENCES "financial_categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "financial_entry_items" (
  "id" UUID NOT NULL,
  "entry_id" UUID NOT NULL,
  "product_id" UUID,
  "description" VARCHAR(255) NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "total_price" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "financial_entry_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "financial_entry_items"
ADD CONSTRAINT "financial_entry_items_entry_id_fkey"
FOREIGN KEY ("entry_id") REFERENCES "financial_entries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_entry_items"
ADD CONSTRAINT "financial_entry_items_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "product_recipe_items" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "material_product_id" UUID NOT NULL,
  "quantity_per_unit" DECIMAL(12,4) NOT NULL,
  "loss_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_recipe_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_recipe_items_product_id_material_product_id_key"
ON "product_recipe_items"("product_id", "material_product_id");

ALTER TABLE "product_recipe_items"
ADD CONSTRAINT "product_recipe_items_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_recipe_items"
ADD CONSTRAINT "product_recipe_items_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_recipe_items"
ADD CONSTRAINT "product_recipe_items_material_product_id_fkey"
FOREIGN KEY ("material_product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "production_records" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity_produced" DECIMAL(12,3) NOT NULL,
  "total_cost" DECIMAL(12,2) NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "produced_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "production_records_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "production_records"
ADD CONSTRAINT "production_records_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_records"
ADD CONSTRAINT "production_records_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_records"
ADD CONSTRAINT "production_records_produced_by_user_id_fkey"
FOREIGN KEY ("produced_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "production_consumptions" (
  "id" UUID NOT NULL,
  "production_record_id" UUID NOT NULL,
  "material_product_id" UUID NOT NULL,
  "quantity_consumed" DECIMAL(12,3) NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "total_cost" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "production_consumptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "production_consumptions"
ADD CONSTRAINT "production_consumptions_production_record_id_fkey"
FOREIGN KEY ("production_record_id") REFERENCES "production_records"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_consumptions"
ADD CONSTRAINT "production_consumptions_material_product_id_fkey"
FOREIGN KEY ("material_product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
