CREATE OR REPLACE VIEW view__users_affected_by_events AS
    SELECT DISTINCT ON (u_id, s_id, e_id) u_id, s_id, events.*
        FROM view__affected_by_events
            INNER JOIN events ON view__affected_by_events.e_id = events.id
    WHERE
        (affects_department OR affects_classname OR affects_classgroup OR (e_audience = 'KLP' and klp_id=u_id))
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
        AND
        (affects_department OR affects_classname OR affects_classgroup)
        AND CASE 
            WHEN e_audience = 'STUDENTS' THEN affects_lesson
            WHEN e_audience = 'ALL' THEN true
            ELSE false
        END
    GROUP BY e_id, s_id, untis_lessons.id;
