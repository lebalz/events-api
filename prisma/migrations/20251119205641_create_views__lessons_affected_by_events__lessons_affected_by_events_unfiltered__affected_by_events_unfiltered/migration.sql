-- NEVER MODIFY THIS FILE MANUALLY! IT IS AUTO-GENERATED USING prisma/view-migrations/create-view-migration.ts

DROP VIEW IF EXISTS view__lessons_affected_by_events;

DROP VIEW IF EXISTS view__lessons_affected_by_events_unfiltered;

DROP VIEW IF EXISTS view__events_classes;

DROP VIEW IF EXISTS view__users_affected_by_events;

DROP VIEW IF EXISTS view__affected_by_events;

DROP VIEW IF EXISTS view__affected_by_events_unfiltered;


CREATE VIEW view__affected_by_events_unfiltered AS
-- view__affected_by_events_unfiltered
SELECT
    events.id as e_id,
    users.id as u_id,
    semesters.id as s_id,
    untis_teachers.id as untis_teacher_id,
    untis_classes.id as c_id,
    untis_classes.name as c_name,
    untis_lessons.id as l_id,
    untis_lessons.subject as l_subject,
    events.audience as e_audience,
    CASE 
        WHEN classes_department.id=events_department.id THEN events_department.id 
    END AS affected_department_id, 
    CASE 
        WHEN classes_department.id=events_department.id
            THEN
                CASE 
                    WHEN events.affects_department2 THEN true /* department has a parent and the event affects it --> ok*/
                    WHEN events.audience IN ('KLP', 'STUDENTS') THEN true
                    WHEN events_department.department1_id IS NULL
                        /* the event is only affected when the subject is not a subject that is thought bilingual by default. */
                        THEN
                            CASE 
                                WHEN untis_lessons.subject ~ '^(SF|SM|EF.*|SPF|SPH|OC.*|MU|BG)$'
                                    THEN (
                                        LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                                        OR
                                        UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                                    )
                                ELSE true
                            END
                    ELSE (
                        /* the event is only affected when the teacher is in department 1 */
                        classes_department.department1_id = events_department.department1_id
                        AND (
                            LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                            OR
                            UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                        )
                    )
                END
        ELSE
            false
    END AS affects_department,
    /* exact class name match 
    *    @> checks wheter both arrays overlap - can use GIN index efficiently 
    *    when department2 is not affected, ensure the bilingual subjects, namely the EF/OC, Music and Sport is not taken into account 
    */
    CASE
        WHEN (
            events.affects_department2 OR 
            CASE 
                WHEN untis_lessons.subject ~ '^(SF|SM|EF.*|SPF|SPH|OC.*|MU|BG)$'
                    THEN (
                        LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                        OR
                        UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                    )
                ELSE true
            END
        ) THEN events.classes @> ARRAY[untis_classes.name]
        ELSE false
    END AS affects_classname,
    CASE 
        WHEN (
            events.affects_department2 OR 
            CASE 
                WHEN untis_lessons.subject ~ '^(SF|SM|EF.*|SPF|SPH|OC.*|MU|BG)$'
                    THEN (
                        LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                        OR
                        UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                    )
                ELSE true
            END
        ) THEN untis_classes.name ~ ('^(' || array_to_string(array_cat(ARRAY[':::'], events.class_groups), '|') || ')') -- SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events.class_groups), '|','--'), ')%')
        ELSE false
    END AS affects_classgroup,
    CASE 
        WHEN events.audience = 'STUDENTS'
            THEN (
                /*                                           DayOfWeek of the event                                      hours                                        minutes                               hours                                  minutes                               duration                                   */
                (MOD((untis_lessons.week_day - extract(DOW FROM events.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.start_hhmm / 100) * 60 + MOD(untis_lessons.start_hhmm, 100)) < extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start) + CEIL(extract(EPOCH FROM AGE(events.end, events.start)) / 60)
                AND
                /*                                           DayOfWeek of the event                                      hours                                        minutes                               hours                                  minutes      */
                (MOD((untis_lessons.week_day - extract(DOW FROM events.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.end_hhmm / 100) * 60 + MOD(untis_lessons.end_hhmm, 100)) > extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start)
            )
        ELSE false
    END as affects_lesson,
    e2u."B" = users.id as affects_user,
    view__klps.u_id=users.id as is_klp
FROM
    users
        LEFT JOIN untis_teachers ON users.untis_id=untis_teachers.id
        LEFT JOIN _teachers_to_lessons ON untis_teachers.id=_teachers_to_lessons."B"
        LEFT JOIN untis_lessons ON _teachers_to_lessons."A"=untis_lessons.id
        LEFT JOIN _classes_to_lessons ON untis_lessons.id=_classes_to_lessons."B"
        LEFT JOIN untis_classes ON _classes_to_lessons."A"=untis_classes.id
        LEFT JOIN semesters ON untis_lessons.semester_id=semesters.id
        LEFT JOIN departments classes_department ON untis_classes.department_id=classes_department.id
        LEFT JOIN view__klps ON untis_classes.id=view__klps.c_id AND untis_lessons.semester_id=view__klps.s_id
    CROSS JOIN events
        LEFT JOIN _events_to_departments ON events.id=_events_to_departments."B"
        LEFT JOIN departments events_department ON _events_to_departments."A"=events_department.id
        LEFT JOIN _events_to_users e2u ON e2u."A"=events.id
WHERE
    (
        events.start BETWEEN semesters.start AND semesters.end
        OR
        events.end BETWEEN semesters.start AND semesters.end
    )
;



CREATE VIEW view__affected_by_events AS
SELECT * FROM view__affected_by_events_unfiltered
WHERE
    affects_department OR affects_classname OR affects_classgroup OR affects_user
;



CREATE VIEW view__users_affected_by_events AS
SELECT DISTINCT ON (u_id, s_id, e_id) u_id, s_id, events.*
    FROM view__affected_by_events
        INNER JOIN events ON view__affected_by_events.e_id=events.id
WHERE
    CASE
        WHEN affects_user THEN true
        WHEN e_audience = 'STUDENTS' THEN (affects_lesson OR is_klp)
        WHEN e_audience = 'KLP' THEN (is_klp)
        WHEN e_audience IN ('LP', 'ALL') THEN true
        ELSE false
    END
;



CREATE VIEW view__events_classes AS
-- view__events_classes
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



CREATE VIEW view__lessons_affected_by_events_unfiltered AS
-- view__lessons_affected_by_events_unfiltered
SELECT
    view__events_classes.id as e_id,
    view__events_classes.start as e_start,
    view__events_classes.end as e_end,
    untis_lessons.id as lesson_id, 
    _teachers_to_lessons."B" AS teacher_id,
    view__events_classes.klass_id AS klass_id
FROM view__events_classes
    INNER JOIN _classes_to_lessons on view__events_classes.klass_id=_classes_to_lessons."A"
    INNER JOIN untis_lessons on _classes_to_lessons."B"=untis_lessons.id
    INNER JOIN _teachers_to_lessons on _teachers_to_lessons."A"=untis_lessons.id

UNION

SELECT
    events.id as e_id,
    events.start as e_start,
    events.end as e_end,
    untis_lessons.id as lesson_id, 
    _teachers_to_lessons."B" AS teacher_id,
    _classes_to_lessons."A" AS klass_id
FROM events 
    JOIN _events_to_users e2u ON e2u."A"=events.id
    JOIN users ON users.id=e2u."B"
    JOIN _teachers_to_lessons ON _teachers_to_lessons."B"=users.untis_id
    JOIN untis_lessons ON _teachers_to_lessons."A"=untis_lessons.id
    JOIN _classes_to_lessons ON _classes_to_lessons."B"=_teachers_to_lessons."A"
;



CREATE VIEW view__lessons_affected_by_events AS
-- view__lessons_affected_by_events
SELECT
    DISTINCT ON (e_id, ul.semester_id, ul.id)
    e_id,
    ul.*,
    ARRAY_AGG(DISTINCT lv.teacher_id) AS teacher_ids,
    ARRAY_AGG(DISTINCT lv.klass_id) AS class_ids
FROM view__lessons_affected_by_events_unfiltered as lv
    JOIN untis_lessons ul ON ul.id=lv.lesson_id
WHERE
    /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes                                                                 duration                                   */
    (MOD((ul.week_day - extract(DOW FROM lv.e_start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(ul.start_hhmm / 100) * 60 + MOD(ul.start_hhmm, 100)) < extract(HOUR FROM lv.e_start) * 60 + extract(MINUTE FROM lv.e_start) + CEIL(extract(EPOCH FROM AGE(lv.e_end, lv.e_start)) / 60)
    AND
    /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes      */
    (MOD((ul.week_day - extract(DOW FROM lv.e_start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(ul.end_hhmm / 100) * 60 + MOD(ul.end_hhmm, 100)) > extract(HOUR FROM lv.e_start) * 60 + extract(MINUTE FROM lv.e_start)
GROUP BY e_id, semester_id, id
;
