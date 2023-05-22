-- AlterTable
ALTER TABLE "events" ADD COLUMN     "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[];
