/*
  Warnings:

  - You are about to drop the column `untis_teacher_id` on the `untis_lessons` table. All the data in the column will be lost.
  - Added the required column `teacher_id` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "untis_lessons" DROP CONSTRAINT "untis_lessons_untis_teacher_id_fkey";

-- AlterTable
ALTER TABLE "untis_lessons" DROP COLUMN "untis_teacher_id",
ADD COLUMN     "teacher_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "untis_lessons" ADD CONSTRAINT "untis_lessons_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "untis_teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
