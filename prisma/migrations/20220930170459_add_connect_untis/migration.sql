/*
  Warnings:

  - A unique constraint covering the columns `[untisId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `allDay` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allDay" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "untisId" INTEGER,
ALTER COLUMN "shortName" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_untisId_key" ON "User"("untisId");
