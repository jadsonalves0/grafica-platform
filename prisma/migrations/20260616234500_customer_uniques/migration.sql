CREATE UNIQUE INDEX "customers_company_id_email_key"
ON "customers" ("company_id", "email");

CREATE UNIQUE INDEX "customers_company_id_document_key"
ON "customers" ("company_id", "document");
