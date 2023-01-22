/*
  Warnings:

  - You are about to drop the column `dids` on the `untis_teachers` table. All the data in the column will be lost.
  - You are about to drop the column `fore_name` on the `untis_teachers` table. All the data in the column will be lost.
  - You are about to drop the `UntisRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UntisSubject` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UntisLessonToUntisRoom" DROP CONSTRAINT "_UntisLessonToUntisRoom_B_fkey";

-- DropForeignKey
ALTER TABLE "untis_lessons" DROP CONSTRAINT "untis_lessons_subject_id_fkey";

-- AlterTable
ALTER TABLE "untis_teachers" DROP COLUMN "dids",
DROP COLUMN "fore_name";

-- DropTable
DROP TABLE "UntisRoom";

-- DropTable
DROP TABLE "UntisSubject";

-- CreateTable
CREATE TABLE "untis_departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,

    CONSTRAINT "untis_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,
    "back_color" TEXT NOT NULL,

    CONSTRAINT "untis_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_rooms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,

    CONSTRAINT "untis_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UntisDepartmentToUntisTeacher" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UntisDepartmentToUntisTeacher_AB_unique" ON "_UntisDepartmentToUntisTeacher"("A", "B");

-- CreateIndex
CREATE INDEX "_UntisDepartmentToUntisTeacher_B_index" ON "_UntisDepartmentToUntisTeacher"("B");

-- AddForeignKey
ALTER TABLE "untis_lessons" ADD CONSTRAINT "untis_lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "untis_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisDepartmentToUntisTeacher" ADD CONSTRAINT "_UntisDepartmentToUntisTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisDepartmentToUntisTeacher" ADD CONSTRAINT "_UntisDepartmentToUntisTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisLessonToUntisRoom" ADD CONSTRAINT "_UntisLessonToUntisRoom_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
