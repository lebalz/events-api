/*
  Warnings:

  - A unique constraint covering the columns `[department1_id]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[department2_id]` on the table `departments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "department1_id" UUID,
ADD COLUMN     "department2_id" UUID;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "affects_department2" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "departments_department1_id_key" ON "departments"("department1_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_department2_id_key" ON "departments"("department2_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_department1_id_fkey" FOREIGN KEY ("department1_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_department2_id_fkey" FOREIGN KEY ("department2_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
