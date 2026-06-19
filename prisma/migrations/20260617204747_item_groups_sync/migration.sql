-- DropForeignKey
ALTER TABLE "financial_entry_items" DROP CONSTRAINT "financial_entry_items_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "production_consumptions" DROP CONSTRAINT "production_consumptions_production_record_id_fkey";

-- AlterTable
ALTER TABLE "product_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "financial_entry_items" ADD CONSTRAINT "financial_entry_items_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "financial_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_consumptions" ADD CONSTRAINT "production_consumptions_production_record_id_fkey" FOREIGN KEY ("production_record_id") REFERENCES "production_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
