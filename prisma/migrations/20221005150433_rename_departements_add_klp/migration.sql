/*
  Warnings:

  - You are about to drop the column `categories` on the `Event` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Departements" AS ENUM ('GYM', 'FMS', 'WMS');

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "categories",
ADD COLUMN     "departements" "Departements"[] DEFAULT ARRAY[]::"Departements"[],
ADD COLUMN     "onlyKLP" BOOLEAN NOT NULL DEFAULT false;
