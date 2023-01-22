/*
  Warnings:

  - You are about to drop the `_UntisDepartmentToUntisTeacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `untis_departments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UntisDepartmentToUntisTeacher" DROP CONSTRAINT "_UntisDepartmentToUntisTeacher_A_fkey";

-- DropForeignKey
ALTER TABLE "_UntisDepartmentToUntisTeacher" DROP CONSTRAINT "_UntisDepartmentToUntisTeacher_B_fkey";

-- DropTable
DROP TABLE "_UntisDepartmentToUntisTeacher";

-- DropTable
DROP TABLE "untis_departments";
