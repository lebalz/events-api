/*
  Warnings:

  - A unique constraint covering the columns `[parent_id]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "parent_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "events_parent_id_key" ON "events"("parent_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- update events_view
DROP VIEW IF EXISTS events_view;
CREATE OR REPLACE VIEW events_view AS
    SELECT 
        events.id AS e_id, 
        events.classes AS classes,
        events.start AS start,
        events.end AS end,
        events.state AS state,
        events.description AS description,
        events.class_groups AS class_groups,
        events.teachers_only AS teachers_only,
        events.klp_only AS klp_only,
        events.subjects AS subjects,
        events.parent_id AS parent_id,
        semesters.id AS s_id,
        array_agg(DISTINCT e2d."A") as department_ids,
        extract(YEAR FROM events.start) AS year_s,
        extract(YEAR FROM events.end) AS year_e,
        extract(DOW  FROM events.start) AS start_week_day,
        extract(DOW  FROM events.end) AS end_week_day,
        extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start) AS start_offset_m, /* the minutes spent on the start day*/
        extract(HOUR FROM events.end) * 60 + extract(MINUTE FROM events.end) AS end_offset_m, /* the minutes spent on the end day*/
        CEIL(extract(EPOCH FROM AGE(events.end, events.start)) / 60) AS duration_m
        FROM events 
            INNER JOIN semesters ON (events.start BETWEEN semesters.start AND semesters.end OR events.end BETWEEN semesters.start AND semesters.end)
            LEFT JOIN _events_to_departments AS e2d ON events.id=e2d."B"
        GROUP BY 
            e_id,
            s_id;