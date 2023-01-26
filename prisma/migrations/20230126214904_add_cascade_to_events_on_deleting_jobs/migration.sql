-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_import_id_fkey";

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
