-- DropForeignKey
ALTER TABLE "untis_lessons" DROP CONSTRAINT "untis_lessons_semester_id_fkey";

-- AddForeignKey
ALTER TABLE "untis_lessons" ADD CONSTRAINT "untis_lessons_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
