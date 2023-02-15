/*
  Warnings:

  - The values [GYM] on the enum `Departments` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Departments_new" AS ENUM ('GBSL', 'GBJB', 'FMS', 'FMPaed', 'ECG', 'WMS', 'ESC', 'MSOP');
ALTER TABLE "events" ALTER COLUMN "departments" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "departments" TYPE "Departments_new"[] USING ("departments"::text::"Departments_new"[]);
ALTER TABLE "untis_classes" ALTER COLUMN "department" TYPE "Departments_new" USING ("department"::text::"Departments_new");
ALTER TYPE "Departments" RENAME TO "Departments_old";
ALTER TYPE "Departments_new" RENAME TO "Departments";
DROP TYPE "Departments_old";
ALTER TABLE "events" ALTER COLUMN "departments" SET DEFAULT ARRAY[]::"Departments"[];
COMMIT;
