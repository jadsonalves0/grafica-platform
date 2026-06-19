ALTER TYPE "ProductType" ADD VALUE 'RESALE';

CREATE TYPE "ProductValueChangeType" AS ENUM ('COST', 'PRICE');

ALTER TABLE "product_categories"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "default_margin" DECIMAL(5, 2),
  ADD COLUMN "show_on_website" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "product_categories"
  ALTER COLUMN "type" DROP NOT NULL;

CREATE UNIQUE INDEX "product_categories_company_id_name_key"
  ON "product_categories"("company_id", "name");

ALTER TABLE "products"
  ADD COLUMN "controls_stock" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_on_website" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "desired_margin" DECIMAL(5, 2);

UPDATE "products"
SET "controls_stock" = false
WHERE "type" = 'SERVICE';

CREATE INDEX "products_company_id_category_id_idx"
  ON "products"("company_id", "category_id");

CREATE TABLE "product_price_histories" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "changed_by_user_id" UUID,
  "change_type" "ProductValueChangeType" NOT NULL,
  "previous_value" DECIMAL(12, 2) NOT NULL,
  "new_value" DECIMAL(12, 2) NOT NULL,
  "origin" VARCHAR(80) NOT NULL,
  "related_document" VARCHAR(120),
  "justification" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_price_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_price_histories_company_id_product_id_created_at_idx"
  ON "product_price_histories"("company_id", "product_id", "created_at");

ALTER TABLE "product_price_histories"
  ADD CONSTRAINT "product_price_histories_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_price_histories"
  ADD CONSTRAINT "product_price_histories_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_price_histories"
  ADD CONSTRAINT "product_price_histories_changed_by_user_id_fkey"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
