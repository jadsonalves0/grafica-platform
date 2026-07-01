ALTER TABLE "inventory_entries"
  ADD COLUMN "source" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "supplier_document" VARCHAR(30),
  ADD COLUMN "document_series" VARCHAR(20),
  ADD COLUMN "access_key" VARCHAR(44),
  ADD COLUMN "issued_at" TIMESTAMP(3),
  ADD COLUMN "protocol" VARCHAR(80);

ALTER TABLE "inventory_entry_items"
  ALTER COLUMN "product_id" DROP NOT NULL,
  ADD COLUMN "supplier_item_mapping_id" UUID,
  ADD COLUMN "line_number" INTEGER,
  ADD COLUMN "supplier_product_code" VARCHAR(80),
  ADD COLUMN "supplier_product_name" VARCHAR(255),
  ADD COLUMN "supplier_ean" VARCHAR(30),
  ADD COLUMN "ncm" VARCHAR(20),
  ADD COLUMN "cfop" VARCHAR(10),
  ADD COLUMN "purchase_unit" VARCHAR(20),
  ADD COLUMN "conversion_factor" DECIMAL(18, 6),
  ADD COLUMN "match_status" VARCHAR(20) DEFAULT 'MATCHED',
  ADD COLUMN "match_confidence" DECIMAL(5, 2);

CREATE TABLE "supplier_item_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "supplier_document" VARCHAR(30),
  "supplier_name" VARCHAR(200),
  "supplier_product_code" VARCHAR(80),
  "supplier_product_name" VARCHAR(255) NOT NULL,
  "supplier_ean" VARCHAR(30),
  "internal_item_id" UUID NOT NULL,
  "purchase_unit" VARCHAR(20),
  "stock_unit" VARCHAR(20),
  "conversion_factor" DECIMAL(18, 6),
  "confidence" DECIMAL(5, 2),
  "last_used_at" TIMESTAMP(3),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_item_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_document_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "inventory_entry_id" UUID,
  "entity_type" VARCHAR(60) NOT NULL,
  "entity_id" VARCHAR(80) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(120) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "storage_path" TEXT NOT NULL,
  "document_type" VARCHAR(60),
  "source" VARCHAR(60),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operational_document_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_entries_company_id_access_key_key"
  ON "inventory_entries"("company_id", "access_key");

CREATE INDEX "supplier_item_mappings_company_id_idx"
  ON "supplier_item_mappings"("company_id");

CREATE INDEX "supplier_item_mappings_company_id_supplier_document_idx"
  ON "supplier_item_mappings"("company_id", "supplier_document");

CREATE INDEX "supplier_item_mappings_company_id_supplier_product_code_idx"
  ON "supplier_item_mappings"("company_id", "supplier_product_code");

CREATE INDEX "supplier_item_mappings_company_id_supplier_ean_idx"
  ON "supplier_item_mappings"("company_id", "supplier_ean");

CREATE INDEX "operational_document_attachments_company_id_entity_type_entity_id_idx"
  ON "operational_document_attachments"("company_id", "entity_type", "entity_id");

ALTER TABLE "inventory_entry_items"
  ADD CONSTRAINT "inventory_entry_items_supplier_item_mapping_id_fkey"
  FOREIGN KEY ("supplier_item_mapping_id") REFERENCES "supplier_item_mappings"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_item_mappings"
  ADD CONSTRAINT "supplier_item_mappings_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_item_mappings"
  ADD CONSTRAINT "supplier_item_mappings_internal_item_id_fkey"
  FOREIGN KEY ("internal_item_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_item_mappings"
  ADD CONSTRAINT "supplier_item_mappings_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_item_mappings"
  ADD CONSTRAINT "supplier_item_mappings_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operational_document_attachments"
  ADD CONSTRAINT "operational_document_attachments_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operational_document_attachments"
  ADD CONSTRAINT "operational_document_attachments_inventory_entry_id_fkey"
  FOREIGN KEY ("inventory_entry_id") REFERENCES "inventory_entries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operational_document_attachments"
  ADD CONSTRAINT "operational_document_attachments_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
