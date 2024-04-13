/*
  Warnings:

  - Added the required column `event_range_end` to the `registration_periods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_range_start` to the `registration_periods` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "registration_periods" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "event_range_start" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "event_range_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "is_open" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE registration_periods
ADD CONSTRAINT registration_periods_event_range_start_end_check
CHECK ("event_range_start" < "event_range_end");
