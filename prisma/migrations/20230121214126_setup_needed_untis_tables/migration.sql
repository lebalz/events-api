/*
  Warnings:

  - You are about to drop the column `end` on the `untis_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `untis_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `subject_id` on the `untis_lessons` table. All the data in the column will be lost.
  - You are about to drop the `_UntisLessonToUntisRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `untis_rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `untis_subjects` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `subject` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `untis_teacher_id` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_UntisLessonToUntisRoom" DROP CONSTRAINT "_UntisLessonToUntisRoom_A_fkey";

-- DropForeignKey
ALTER TABLE "_UntisLessonToUntisRoom" DROP CONSTRAINT "_UntisLessonToUntisRoom_B_fkey";

-- DropForeignKey
ALTER TABLE "untis_lessons" DROP CONSTRAINT "untis_lessons_subject_id_fkey";

-- AlterTable
ALTER TABLE "untis_lessons" DROP COLUMN "end",
DROP COLUMN "start",
DROP COLUMN "subject_id",
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "untis_teacher_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_UntisLessonToUntisRoom";

-- DropTable
DROP TABLE "untis_rooms";

-- DropTable
DROP TABLE "untis_subjects";

-- AddForeignKey
ALTER TABLE "untis_lessons" ADD CONSTRAINT "untis_lessons_untis_teacher_id_fkey" FOREIGN KEY ("untis_teacher_id") REFERENCES "untis_teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
