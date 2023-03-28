/*
  Warnings:

  - Added the required column `year` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `semester` on the `untis_lessons` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "untis_lessons" ADD COLUMN     "year" INTEGER NOT NULL,
DROP COLUMN "semester",
ADD COLUMN     "semester" INTEGER NOT NULL;
