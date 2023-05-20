/*
  Warnings:

  - The values [DELETED] on the enum `EventState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventState_new" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'REFUSED');
ALTER TABLE "events" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "state" TYPE "EventState_new" USING ("state"::text::"EventState_new");
ALTER TYPE "EventState" RENAME TO "EventState_old";
ALTER TYPE "EventState_new" RENAME TO "EventState";
DROP TYPE "EventState_old";
ALTER TABLE "events" ALTER COLUMN "state" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "deleted_at" TIMESTAMP(3);
