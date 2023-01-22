/*
  Warnings:

  - You are about to drop the column `teacher_id` on the `untis_lessons` table. All the data in the column will be lost.
  - You are about to drop the `_UntisClassToUntisLesson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UntisClassToUntisTeacher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UntisClassToUntisLesson" DROP CONSTRAINT "_UntisClassToUntisLesson_A_fkey";

-- DropForeignKey
ALTER TABLE "_UntisClassToUntisLesson" DROP CONSTRAINT "_UntisClassToUntisLesson_B_fkey";

-- DropForeignKey
ALTER TABLE "_UntisClassToUntisTeacher" DROP CONSTRAINT "_UntisClassToUntisTeacher_A_fkey";

-- DropForeignKey
ALTER TABLE "_UntisClassToUntisTeacher" DROP CONSTRAINT "_UntisClassToUntisTeacher_B_fkey";

-- DropForeignKey
ALTER TABLE "untis_lessons" DROP CONSTRAINT "untis_lessons_teacher_id_fkey";

-- AlterTable
ALTER TABLE "untis_lessons" DROP COLUMN "teacher_id";

-- DropTable
DROP TABLE "_UntisClassToUntisLesson";

-- DropTable
DROP TABLE "_UntisClassToUntisTeacher";

-- CreateTable
CREATE TABLE "__teachers_to_lessons" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "__classes_to_lessons" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "__teachers_to_classes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "__teachers_to_lessons_AB_unique" ON "__teachers_to_lessons"("A", "B");

-- CreateIndex
CREATE INDEX "__teachers_to_lessons_B_index" ON "__teachers_to_lessons"("B");

-- CreateIndex
CREATE UNIQUE INDEX "__classes_to_lessons_AB_unique" ON "__classes_to_lessons"("A", "B");

-- CreateIndex
CREATE INDEX "__classes_to_lessons_B_index" ON "__classes_to_lessons"("B");

-- CreateIndex
CREATE UNIQUE INDEX "__teachers_to_classes_AB_unique" ON "__teachers_to_classes"("A", "B");

-- CreateIndex
CREATE INDEX "__teachers_to_classes_B_index" ON "__teachers_to_classes"("B");

-- AddForeignKey
ALTER TABLE "__teachers_to_lessons" ADD CONSTRAINT "__teachers_to_lessons_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__teachers_to_lessons" ADD CONSTRAINT "__teachers_to_lessons_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__classes_to_lessons" ADD CONSTRAINT "__classes_to_lessons_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__classes_to_lessons" ADD CONSTRAINT "__classes_to_lessons_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__teachers_to_classes" ADD CONSTRAINT "__teachers_to_classes_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__teachers_to_classes" ADD CONSTRAINT "__teachers_to_classes_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
