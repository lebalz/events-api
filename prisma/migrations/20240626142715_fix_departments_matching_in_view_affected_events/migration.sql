DROP VIEW IF EXISTS view__lessons_affected_by_events;
DROP VIEW IF EXISTS view__users_affected_by_events;
DROP VIEW IF EXISTS view__affected_by_events;
DROP VIEW IF exists view__klps;

CREATE OR REPLACE VIEW view__klps AS
    SELECT distinct on (untis_classes.id, untis_teachers.id, untis_lessons.semester_id)
        users.id as u_id,
        untis_teachers.id as t_id, 
        untis_teachers.name as t_name, 
        untis_classes.id as c_id, 
        untis_classes.name as c_name, 
        untis_lessons.semester_id as s_id
    FROM untis_teachers
        join _teachers_to_lessons ON untis_teachers.id=_teachers_to_lessons."B"
        join untis_lessons ON _teachers_to_lessons."A"=untis_lessons.id
        join _classes_to_lessons ON untis_lessons.id=_classes_to_lessons."B"
        join untis_classes ON _classes_to_lessons."A"=untis_classes.id
        left join users on untis_teachers.id=users.untis_id
    WHERE subject in ('KS', 'MC');

CREATE OR REPLACE VIEW view__affected_by_events AS
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
        CASE WHEN classes_department.id=events_department.id THEN events_department.id END AS affected_department_id, 
        CASE 
            WHEN classes_department.id=events_department.id
                THEN
                    CASE 
                        WHEN events.affects_department2 THEN true
                        WHEN events.audience IN ('KLP', 'STUDENTS') THEN true
                        WHEN events_department.department1_id IS NULL THEN true
                        ELSE (
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
        CASE WHEN (
                    events.affects_department2 OR 
                    CASE
                        WHEN untis_lessons.subject SIMILAR TO '(SF|SM|EF%)' THEN UPPER(classes_department.letter) = classes_department.letter
                        WHEN untis_lessons.subject SIMILAR TO '(SPF|SPH|OC%)' THEN LOWER(classes_department.letter) = classes_department.letter
                        WHEN untis_lessons.subject SIMILAR TO '(MU|BG)' THEN (
                            LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                            OR
                            UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                        )
                        ELSE true
                    END
            ) THEN events.classes @> ARRAY[untis_classes.name]
        ELSE false
        END AS affects_classname,
        CASE WHEN (
                events.affects_department2 OR 
                CASE 
                    WHEN untis_lessons.subject similar to '(SF|SM|EF%)' THEN UPPER(classes_department.letter) = classes_department.letter
                    WHEN untis_lessons.subject similar to '(SPF|SPH|OC%)' THEN LOWER(classes_department.letter) = classes_department.letter
                    WHEN untis_lessons.subject SIMILAR TO '(MU|BG)' THEN (
                        LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                        OR
                        UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                    )
                    ELSE true
                END
            ) THEN untis_classes.name SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events.class_groups), '|','--'), ')%')
        ELSE false
        END AS affects_classgroup,
        CASE WHEN events.audience = 'STUDENTS'
            THEN (
                /*                                           DayOfWeek of the event                                      hours                                        minutes                               hours                                  minutes                               duration                                   */
                (MOD((untis_lessons.week_day - extract(DOW FROM events.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.start_hhmm / 100) * 60 + MOD(untis_lessons.start_hhmm, 100)) < extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start) + CEIL(extract(EPOCH FROM AGE(events.end, events.start)) / 60)
                AND
                /*                                           DayOfWeek of the event                                      hours                                        minutes                               hours                                  minutes      */
                (MOD((untis_lessons.week_day - extract(DOW FROM events.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.end_hhmm / 100) * 60 + MOD(untis_lessons.end_hhmm, 100)) > extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start)
            )
            ELSE false
        END as affects_lesson,
        view__klps.u_id as klp_id
    FROM
        untis_lessons
            JOIN _teachers_to_lessons ON untis_lessons.id=_teachers_to_lessons."A"
            JOIN untis_teachers ON _teachers_to_lessons."B"=untis_teachers.id
            JOIN users ON untis_teachers.id=users.untis_id
            JOIN _classes_to_lessons ON untis_lessons.id=_classes_to_lessons."B"
            JOIN untis_classes ON _classes_to_lessons."A"=untis_classes.id
            JOIN semesters ON untis_lessons.semester_id=semesters.id
            JOIN departments classes_department ON untis_classes.department_id=classes_department.id
            LEFT JOIN view__klps ON untis_classes.id=view__klps.c_id AND untis_lessons.semester_id=view__klps.s_id
            CROSS JOIN events
            LEFT JOIN _events_to_departments ON events.id=_events_to_departments."B"
            LEFT JOIN departments events_department ON _events_to_departments."A"=events_department.id
    WHERE
        (events.start BETWEEN semesters.start AND semesters.end OR events.end BETWEEN semesters.start AND semesters.end)
        AND
        (events_department.id IS NULL OR events_department.id=classes_department.id)
    ;


CREATE OR REPLACE VIEW view__users_affected_by_events AS
    SELECT DISTINCT ON (u_id, s_id, e_id) u_id, s_id, events.*
        FROM view__affected_by_events
            INNER JOIN events ON view__affected_by_events.e_id = events.id
    WHERE
        (affects_department OR affects_classname OR affects_classgroup OR (e_audience = 'STUDENTS' AND ((affected_department_id IS NOT NULL AND affects_lesson) OR klp_id=u_id)) OR (e_audience = 'KLP' and klp_id=u_id))
        AND CASE 
            WHEN e_audience = 'STUDENTS' THEN (affects_lesson OR klp_id=u_id)
            WHEN e_audience = 'KLP' THEN (klp_id=u_id AND (affects_department OR affects_classname OR affects_classgroup))
            WHEN e_audience IN ('LP', 'ALL') THEN true
            ELSE false
        END;


CREATE OR REPLACE VIEW view__lessons_affected_by_events AS
    SELECT DISTINCT ON (e_id, s_id, untis_lessons.id)
        e_id, s_id, untis_lessons.*, 
        ARRAY_AGG(DISTINCT untis_teacher_id) AS teacher_ids,
        ARRAY_AGG(DISTINCT c_id) AS class_ids
    FROM view__affected_by_events
        JOIN untis_lessons ON l_id=untis_lessons.id
    WHERE
        e_audience IN ('STUDENTS', 'ALL')
        AND (affects_department OR affects_classname OR affects_classgroup OR (e_audience = 'STUDENTS' AND (affected_department_id IS NOT NULL AND affects_lesson)))
        AND CASE 
            WHEN e_audience = 'STUDENTS' THEN affects_lesson
            WHEN e_audience = 'ALL' THEN true
            ELSE false
        END
    GROUP BY e_id, s_id, untis_lessons.id;
