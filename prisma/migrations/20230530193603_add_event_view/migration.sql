-- This is an empty migration.

CREATE VIEW event_view AS
    SELECT 
        semester_view.id AS s_id,
        semester_view.semester_year AS s_year,
        semester_view.semester_nr AS s_nr,
        semester_view.has_lessons AS s_active,
        (CASE WHEN semester_view.has_lessons THEN semester_view.semester_year ELSE extract(YEAR FROM CURRENT_TIMESTAMP) END) AS join_semester_year,
        (CASE WHEN semester_view.has_lessons THEN semester_view.semester_nr ELSE CASE WHEN (extract(MONTH FROM CURRENT_TIMESTAMP) < 6) THEN 2 ELSE 1 END END) AS join_semester_nr,
        events.id AS e_id, 
        events.classes AS classes,
        events.description AS description,
        events.class_groups AS class_groups,
        events.teachers_only AS teachers_only,
        events.klp_only AS klp_only,
        events.subjects AS subjects,
        array_agg(DISTINCT e2d."A") as department_ids,
        extract(YEAR FROM events.start) AS year_s,
        extract(YEAR FROM events.end) AS year_e,
        extract(DOW  FROM events.start) AS start_week_day,
        extract(DOW  FROM events.end) AS end_week_day,
        extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start) AS start_offset_m, /* the minutes spent on the start day*/
        extract(HOUR FROM events.end) * 60 + extract(MINUTE FROM events.end) AS end_offset_m, /* the minutes spent on the end day*/
        CEIL(extract(EPOCH FROM AGE(events.end, events.start)) / 60) AS duration_m
        FROM events 
            INNER JOIN semester_view ON events.start < semester_view.end AND events.end > semester_view.start
            LEFT JOIN _events_to_departments AS e2d ON events.id=e2d."B"
        GROUP BY 
            s_id, 
            s_year,
            s_nr,
            s_active, 
            e_id, 
            classes, 
            class_groups, 
            teachers_only, 
            klp_only, 
            subjects, 
            year_s, 
            year_e, 
            start_week_day, 
            start_offset_m, 
            duration_m, 
            description