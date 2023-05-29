/*
  Warnings:

  - The primary key for the `departments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `import_id` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `jobs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `registration_periods` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `semesters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `department_id` column on the `untis_classes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `A` on the `_events_to_departments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `B` on the `_events_to_departments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `departments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `author_id` on the `events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `registration_periods` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `semesters` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "_events_to_departments" DROP CONSTRAINT "_events_to_departments_A_fkey";

-- DropForeignKey
ALTER TABLE "_events_to_departments" DROP CONSTRAINT "_events_to_departments_B_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_author_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_import_id_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "untis_classes" DROP CONSTRAINT "untis_classes_department_id_fkey";

-- AlterTable
ALTER TABLE "_events_to_departments" DROP COLUMN "A",
ADD COLUMN     "A" UUID NOT NULL,
DROP COLUMN "B",
ADD COLUMN     "B" UUID NOT NULL;

-- AlterTable
ALTER TABLE "departments" DROP CONSTRAINT "departments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "color" SET DEFAULT '#306cce',
ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "events" DROP CONSTRAINT "events_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "author_id",
ADD COLUMN     "author_id" UUID NOT NULL,
DROP COLUMN "import_id",
ADD COLUMN     "import_id" UUID,
ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "registration_periods" DROP CONSTRAINT "registration_periods_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "registration_periods_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "semesters" DROP CONSTRAINT "semesters_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "semesters_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "untis_classes" DROP COLUMN "department_id",
ADD COLUMN     "department_id" UUID;

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "_events_to_departments_AB_unique" ON "_events_to_departments"("A", "B");

-- CreateIndex
CREATE INDEX "_events_to_departments_B_index" ON "_events_to_departments"("B");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "untis_classes" ADD CONSTRAINT "untis_classes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_events_to_departments" ADD CONSTRAINT "_events_to_departments_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_events_to_departments" ADD CONSTRAINT "_events_to_departments_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
