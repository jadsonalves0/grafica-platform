CREATE TABLE "suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "legal_name" VARCHAR(200) NOT NULL,
  "trade_name" VARCHAR(200),
  "document" VARCHAR(30),
  "email" VARCHAR(200),
  "phone" VARCHAR(30),
  "whatsapp" VARCHAR(30),
  "contact_name" VARCHAR(200),
  "address_zip_code" VARCHAR(20),
  "address_street" VARCHAR(200),
  "address_number" VARCHAR(20),
  "address_district" VARCHAR(120),
  "address_city" VARCHAR(120),
  "address_state" VARCHAR(80),
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inventory_entries"
  ADD COLUMN "supplier_id" UUID;

ALTER TABLE "supplier_item_mappings"
  ADD COLUMN "supplier_id" UUID;

CREATE UNIQUE INDEX "suppliers_company_id_document_key"
  ON "suppliers"("company_id", "document");

CREATE INDEX "suppliers_company_id_is_active_legal_name_idx"
  ON "suppliers"("company_id", "is_active", "legal_name");

CREATE INDEX "suppliers_company_id_trade_name_idx"
  ON "suppliers"("company_id", "trade_name");

CREATE INDEX "inventory_entries_company_id_supplier_id_entry_date_idx"
  ON "inventory_entries"("company_id", "supplier_id", "entry_date");

CREATE INDEX "supplier_item_mappings_company_id_supplier_id_idx"
  ON "supplier_item_mappings"("company_id", "supplier_id");

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_entries"
  ADD CONSTRAINT "inventory_entries_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_item_mappings"
  ADD CONSTRAINT "supplier_item_mappings_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

WITH supplier_candidates AS (
  SELECT
    company_id,
    NULLIF(TRIM(supplier_document), '') AS document,
    NULLIF(TRIM(supplier_name), '') AS legal_name
  FROM inventory_entries
  WHERE NULLIF(TRIM(supplier_name), '') IS NOT NULL

  UNION

  SELECT
    company_id,
    NULLIF(TRIM(supplier_document), '') AS document,
    NULLIF(TRIM(supplier_name), '') AS legal_name
  FROM supplier_item_mappings
  WHERE NULLIF(TRIM(supplier_name), '') IS NOT NULL

  UNION

  SELECT
    company_id,
    NULL::VARCHAR(30) AS document,
    NULLIF(TRIM(supplier_name), '') AS legal_name
  FROM financial_entries
  WHERE NULLIF(TRIM(supplier_name), '') IS NOT NULL
),
deduplicated_suppliers AS (
  SELECT DISTINCT ON (
    company_id,
    COALESCE(document, LOWER(legal_name))
  )
    company_id,
    legal_name,
    document
  FROM supplier_candidates
  WHERE legal_name IS NOT NULL
  ORDER BY
    company_id,
    COALESCE(document, LOWER(legal_name)),
    CASE WHEN document IS NOT NULL THEN 0 ELSE 1 END,
    legal_name
)
INSERT INTO suppliers (
  company_id,
  legal_name,
  document
)
SELECT
  company_id,
  legal_name,
  document
FROM deduplicated_suppliers;

UPDATE inventory_entries AS entry
SET supplier_id = supplier.id
FROM suppliers AS supplier
WHERE entry.company_id = supplier.company_id
  AND entry.supplier_id IS NULL
  AND (
    (
      NULLIF(TRIM(entry.supplier_document), '') IS NOT NULL
      AND supplier.document = NULLIF(TRIM(entry.supplier_document), '')
    )
    OR (
      NULLIF(TRIM(entry.supplier_document), '') IS NULL
      AND NULLIF(TRIM(entry.supplier_name), '') IS NOT NULL
      AND LOWER(TRIM(supplier.legal_name)) = LOWER(TRIM(entry.supplier_name))
    )
  );

UPDATE supplier_item_mappings AS mapping
SET supplier_id = supplier.id
FROM suppliers AS supplier
WHERE mapping.company_id = supplier.company_id
  AND mapping.supplier_id IS NULL
  AND (
    (
      NULLIF(TRIM(mapping.supplier_document), '') IS NOT NULL
      AND supplier.document = NULLIF(TRIM(mapping.supplier_document), '')
    )
    OR (
      NULLIF(TRIM(mapping.supplier_document), '') IS NULL
      AND NULLIF(TRIM(mapping.supplier_name), '') IS NOT NULL
      AND LOWER(TRIM(supplier.legal_name)) = LOWER(TRIM(mapping.supplier_name))
    )
  );
