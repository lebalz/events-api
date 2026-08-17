-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "semester_transition_day" SMALLINT NOT NULL DEFAULT 14,
ADD COLUMN     "semester_transition_month" SMALLINT NOT NULL DEFAULT 7;

-- This is the auto-generated CREATE TABLE, then add:
ALTER TABLE "departments"
  ADD CONSTRAINT departments_month_range_check CHECK (semester_transition_month BETWEEN 1 AND 12);

ALTER TABLE "departments"
  ADD CONSTRAINT departments_day_range_check CHECK (semester_transition_day BETWEEN 1 AND 31);