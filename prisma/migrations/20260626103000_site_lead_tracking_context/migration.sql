ALTER TABLE "site_leads"
ADD COLUMN "origin" VARCHAR(80) NOT NULL DEFAULT 'website',
ADD COLUMN "page_url" TEXT,
ADD COLUMN "page_path" VARCHAR(255),
ADD COLUMN "referrer_url" TEXT,
ADD COLUMN "utm_source" VARCHAR(120),
ADD COLUMN "utm_medium" VARCHAR(120),
ADD COLUMN "utm_campaign" VARCHAR(160),
ADD COLUMN "utm_content" VARCHAR(160),
ADD COLUMN "utm_term" VARCHAR(160);
