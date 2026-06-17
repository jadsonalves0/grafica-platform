ALTER TABLE "products"
ADD COLUMN "barcode" VARCHAR(14);

CREATE UNIQUE INDEX "products_company_id_barcode_key"
ON "products"("company_id", "barcode");
