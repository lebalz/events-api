/*
  Warnings:

  - Added the required column `year` to the `untis_classes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "untis_classes" ADD COLUMN     "year" INTEGER NOT NULL;
