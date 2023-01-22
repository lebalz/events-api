/*
  Warnings:

  - Added the required column `end` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_hhmm` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_hhmm` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `week_day` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "untis_lessons" ADD COLUMN     "end" BIGINT NOT NULL,
ADD COLUMN     "end_hhmm" INTEGER NOT NULL,
ADD COLUMN     "start" BIGINT NOT NULL,
ADD COLUMN     "start_hhmm" INTEGER NOT NULL,
ADD COLUMN     "week_day" INTEGER NOT NULL;
