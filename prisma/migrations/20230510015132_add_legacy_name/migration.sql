/*
  Warnings:

  - You are about to drop the column `class_years` on the `events` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[legacy_name]` on the table `untis_classes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "class_years",
ADD COLUMN     "class_groups" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "untis_classes" ADD COLUMN     "legacy_name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "untis_classes_legacy_name_key" ON "untis_classes"("legacy_name");
