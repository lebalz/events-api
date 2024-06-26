
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
                        WHEN events_department.department1_id IS NULL
                            THEN
                                CASE 
                                    WHEN untis_lessons.subject similar to '(SF|SM|EF%|SPF|SPH|OC%|MU|BG)' THEN (
                                            LOWER(classes_department.letter) = classes_department.letter AND UPPER(untis_teachers.name)=untis_teachers.name
                                            OR
                                            UPPER(classes_department.letter) = classes_department.letter AND LOWER(untis_teachers.name)=untis_teachers.name
                                        )
                                    ELSE true
                                END
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
                        WHEN untis_lessons.subject similar to '(SF|SM|EF%|SPF|SPH|OC%|MU|BG)' THEN (
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
                    WHEN untis_lessons.subject similar to '(SF|SM|EF%|SPF|SPH|OC%|MU|BG)' THEN (
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