/*
  Warnings:

  - You are about to drop the column `only_klp` on the `events` table. All the data in the column will be lost.
  - You are about to drop the `_responsible_for` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ImportState" AS ENUM ('PENDING', 'ERROR', 'DONE', 'REVERTED');

-- DropForeignKey
ALTER TABLE "_responsible_for" DROP CONSTRAINT "_responsible_for_A_fkey";

-- DropForeignKey
ALTER TABLE "_responsible_for" DROP CONSTRAINT "_responsible_for_B_fkey";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "only_klp",
ADD COLUMN     "import_id" TEXT;

-- DropTable
DROP TABLE "_responsible_for";

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "state" "ImportState" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
