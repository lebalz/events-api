-- AlterTable
ALTER TABLE "events" ADD COLUMN "cloned_from_id" UUID DEFAULT NULL;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cloned_from_id_fkey" FOREIGN KEY ("cloned_from_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP VIEW IF EXISTS view__lessons_affected_by_events;
DROP VIEW IF EXISTS view__events_classes;

DROP VIEW IF EXISTS view__users_affected_by_events;
DROP VIEW IF EXISTS view__events_registration_periods;
DROP VIEW IF EXISTS view__events_departments;

CREATE OR REPLACE VIEW view__events_classes AS
    SELECT events.*, untis_classes.id AS klass_id, untis_classes.name AS klass_name, departments.id AS department_id
        FROM events 
            JOIN _events_to_departments e2d ON e2d."B"=events.id
            JOIN departments ON departments.id=e2d."A"
            JOIN untis_classes ON untis_classes.department_id=departments.id

    UNION

    SELECT events.*, untis_classes.id AS klass_id, untis_classes.name AS klass_name, untis_classes.department_id AS department_id
        FROM events
            JOIN untis_classes ON events.classes @> ARRAY[untis_classes.name]

    UNION

    SELECT events.*, untis_classes.id AS klass_id, untis_classes.name AS klass_name, untis_classes.department_id AS department_id
        FROM events
            JOIN untis_classes ON untis_classes.name SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events.class_groups), '|','--'), ')%')
;

CREATE OR REPLACE VIEW view__lessons_affected_by_events AS
    SELECT 
        DISTINCT ON (view__events_classes.id, untis_lessons.semester_id, untis_lessons.id)
        view__events_classes.id as e_id,
        untis_lessons.semester_id as s_id,
        untis_lessons.*, 
        ARRAY_AGG(DISTINCT _teachers_to_lessons."B") AS teacher_ids,
        ARRAY_AGG(DISTINCT view__events_classes.klass_id) AS class_ids
    FROM view__events_classes
        INNER JOIN _classes_to_lessons on view__events_classes.klass_id=_classes_to_lessons."A"
        INNER JOIN untis_lessons on _classes_to_lessons."B"=untis_lessons.id
        INNER JOIN _teachers_to_lessons on _teachers_to_lessons."A"=untis_lessons.id
    WHERE 
        /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes                                                                 duration                                   */
        (MOD((untis_lessons.week_day - extract(DOW FROM view__events_classes.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.start_hhmm / 100) * 60 + MOD(untis_lessons.start_hhmm, 100)) < extract(HOUR FROM view__events_classes.start) * 60 + extract(MINUTE FROM view__events_classes.start) + CEIL(extract(EPOCH FROM AGE(view__events_classes.end, view__events_classes.start)) / 60)
        AND
        /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes      */
        (MOD((untis_lessons.week_day - extract(DOW FROM view__events_classes.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.end_hhmm / 100) * 60 + MOD(untis_lessons.end_hhmm, 100)) > extract(HOUR FROM view__events_classes.start) * 60 + extract(MINUTE FROM view__events_classes.start)    
    GROUP BY view__events_classes.id, untis_lessons.semester_id, untis_lessons.id
;

CREATE OR REPLACE VIEW view__events_departments AS
    SELECT
        events.*,
        e2d."A" AS d_id
    FROM events
        JOIN _events_to_departments e2d ON e2d."B"=events.id
    
    UNION DISTINCT

    SELECT
        events.*,
        untis_classes.department_id AS d_id
    FROM events
        JOIN untis_classes ON untis_classes.name = ANY(events.classes)
    
    UNION DISTINCT

    SELECT
        events.*,
        untis_classes.department_id AS d_id
    FROM events
        JOIN untis_classes ON untis_classes.name SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events.class_groups), '|','--'), ')%')
;

CREATE OR REPLACE VIEW view__events_registration_periods AS
    SELECT
        events2departments.id AS e_id,
        events2departments.d_id AS d_id,
        reg_period.id AS rp_id,
        reg_period.name AS rp_name,
        reg_period.is_open AS rp_is_open,
        reg_period.start AS rp_start,
        reg_period.end AS rp_end,
        reg_period.event_range_start AS rp_event_range_start,
        reg_period.event_range_end AS rp_event_range_end
    FROM
        view__events_departments AS events2departments
        JOIN _registration_periods_to_departments AS rp2d ON rp2d."A"=events2departments.d_id
        JOIN registration_periods AS reg_period ON reg_period.id=rp2d."B"
    WHERE
        events2departments.start >= reg_period.event_range_start
        AND events2departments.start <= reg_period.event_range_end;

CREATE OR REPLACE VIEW view__users_affected_by_events AS
    SELECT DISTINCT ON (u_id, s_id, e_id) u_id, s_id, events.*
        FROM view__affected_by_events
            INNER JOIN events ON view__affected_by_events.e_id = events.id
    WHERE
        (affects_department OR affects_classname OR affects_classgroup)
        AND
        CASE 
            WHEN e_audience = 'STUDENTS' THEN (affects_lesson OR is_klp)
            WHEN e_audience = 'KLP' THEN (is_klp)
            WHEN e_audience IN ('LP', 'ALL') THEN true
            ELSE false
        END
;