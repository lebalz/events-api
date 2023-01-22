/*
  Warnings:

  - You are about to drop the column `end_hhmm` on the `untis_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `start_hhmm` on the `untis_lessons` table. All the data in the column will be lost.
  - Added the required column `end_dhhmm` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_dhhmm` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "untis_lessons" DROP COLUMN "end_hhmm",
DROP COLUMN "start_hhmm",
ADD COLUMN     "end_dhhmm" INTEGER NOT NULL,
ADD COLUMN     "start_dhhmm" INTEGER NOT NULL;
