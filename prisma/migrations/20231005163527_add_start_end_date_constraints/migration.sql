-- This is an empty migration.
ALTER TABLE registration_periods
ADD CONSTRAINT registration_periods_start_end_check
CHECK ("start" < "end");

ALTER TABLE semesters
ADD CONSTRAINT semesters_start_end_check
CHECK ("start" < "end");

ALTER TABLE semesters
ADD CONSTRAINT semesters_start_untis_sync_date_check
CHECK ("start" < "untisSyncDate");

ALTER TABLE semesters
ADD CONSTRAINT semesters_untis_sync_date_end_check
CHECK ("untisSyncDate" < "end");

ALTER TABLE events
ADD CONSTRAINT events_start_end_check
CHECK ("start" <= "end");

