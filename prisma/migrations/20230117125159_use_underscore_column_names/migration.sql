/*
  Warnings:

  - You are about to drop the column `allDay` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionLong` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `onlyKLP` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `shortName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `untisId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[untis_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[short_name]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `all_day` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author_id` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_long` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_authorId_fkey";

-- DropIndex
DROP INDEX "User_shortName_key";

-- DropIndex
DROP INDEX "User_untisId_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "allDay",
DROP COLUMN "authorId",
DROP COLUMN "createdAt",
DROP COLUMN "descriptionLong",
DROP COLUMN "onlyKLP",
DROP COLUMN "updatedAt",
ADD COLUMN     "all_day" BOOLEAN NOT NULL,
ADD COLUMN     "author_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description_long" TEXT NOT NULL,
ADD COLUMN     "only_klp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "shortName",
DROP COLUMN "untisId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "short_name" TEXT,
ADD COLUMN     "untis_id" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_untis_id_key" ON "User"("untis_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_short_name_key" ON "User"("short_name");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
