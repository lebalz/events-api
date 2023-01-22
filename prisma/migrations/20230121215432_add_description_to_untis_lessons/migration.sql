/*
  Warnings:

  - Added the required column `description` to the `untis_lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "untis_lessons" ADD COLUMN     "description" TEXT NOT NULL;
