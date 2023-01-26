/*
  Warnings:

  - You are about to drop the `imports` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('PENDING', 'ERROR', 'DONE', 'REVERTED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('IMPORT', 'CLONE');

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_import_id_fkey";

-- DropForeignKey
ALTER TABLE "imports" DROP CONSTRAINT "imports_user_id_fkey";

-- DropTable
DROP TABLE "imports";

-- DropEnum
DROP TYPE "ImportState";

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT NOT NULL,
    "log" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
