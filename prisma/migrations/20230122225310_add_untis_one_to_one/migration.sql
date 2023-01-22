-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_untis_id_fkey" FOREIGN KEY ("untis_id") REFERENCES "untis_teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
