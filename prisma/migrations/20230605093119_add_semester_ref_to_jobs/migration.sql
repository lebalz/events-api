-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "semester_id" UUID;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
