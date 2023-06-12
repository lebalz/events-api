-- CreateEnum
CREATE TYPE "TeachingAffected" AS ENUM ('YES', 'PARTIAL', 'NO');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "teaching_affected" "TeachingAffected" NOT NULL DEFAULT 'YES';
