/*
  Warnings:

  - The `class_years` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "class_years",
ADD COLUMN     "class_years" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
