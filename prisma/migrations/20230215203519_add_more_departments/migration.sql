/*
  Warnings:

  - You are about to drop the column `departements` on the `events` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Departments" AS ENUM ('GYM', 'GBSL', 'GBJB', 'FMS', 'FMPaed', 'ECG', 'WMS', 'ESC', 'MSOP');

-- AlterTable
ALTER TABLE "events" DROP COLUMN "departements",
ADD COLUMN     "departments" "Departments"[] DEFAULT ARRAY[]::"Departments"[];

-- AlterTable
ALTER TABLE "untis_classes" ADD COLUMN     "department" "Departments";

-- DropEnum
DROP TYPE "Departements";

-- migrate GYM to GBSL

UPDATE "events" SET "departments" = array_replace("departments", 'GYM', 'GBSL') WHERE "departments" @> ARRAY['GYM']::"Departments"[];