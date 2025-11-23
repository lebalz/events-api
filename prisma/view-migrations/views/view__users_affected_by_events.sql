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