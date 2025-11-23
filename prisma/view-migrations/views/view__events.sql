SELECT 
    events.id AS e_id, 
    events.classes AS classes,
    events.start AS start,
    events.end AS end,
    events.state AS state,
    events.description AS description,
    events.class_groups AS class_groups,
    events.audience AS audience,
    events.parent_id AS parent_id,
    events.affects_department2 as affects_department2,
    semesters.id AS s_id,
    array_remove(array_agg(DISTINCT departments.id), NULL) as department_ids,
    array_remove(array_agg(DISTINCT COALESCE(departments.department1_id, departments.id)), NULL) as department_school_ids,
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
    LEFT JOIN departments ON e2d."A"=departments.id
GROUP BY 
    e_id,
    s_id;