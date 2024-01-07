CREATE OR REPLACE VIEW view__users_teaching AS
    SELECT
        users.id AS u_id,
        users.email AS u_email, 
        classes.id AS c_id,
        classes.name AS c_name,
        classes.legacy_name AS c_name_legacy,
        lessons.id AS l_id,
        lessons.subject AS l_subject,
        lessons.start_hhmm AS l_start_hhmm,
        lessons.end_hhmm AS l_end_hhmm,
        lessons.week_day AS l_week_day,
        lessons.semester_id as l_semester_id,
        departments.id AS d_id,
        COALESCE(   CASE WHEN UPPER(untis_teachers.name) = untis_teachers.name -- Grossbuchstaben --> franz. gymer
                    THEN 
                        CASE WHEN LOWER(d_1.letter) = d_1.letter -- Kleinbuchstaben --> franz. gymer
                        THEN d_1.id
                        ELSE d_2.id
                        END
                    ELSE
                        CASE WHEN UPPER(d_1.letter) = d_1.letter -- Grossbuchstaben --> deutsch. gymer
                        THEN d_1.id
                        ELSE d_2.id
                        END
                    END,
                    CASE WHEN lessons.subject LIKE 'EF%' or lessons.subject LIKE 'OC%'
                    THEN
                        CASE WHEN LOWER(departments.letter) = departments.letter -- Kleinbuchstaben --> franz. gymer
                        THEN 
                            CASE WHEN UPPER(untis_teachers.name) = untis_teachers.name -- Grossbuchstaben --> franz. gymer
                            THEN departments.id
                            ELSE NULL
                            END
                        ELSE
                            CASE WHEN LOWER(untis_teachers.name) = untis_teachers.name -- Grossbuchstaben --> deutsch. gymer
                            THEN departments.id
                            ELSE NULL
                            END
                        END
                    ELSE departments.id
                    END
                ) AS d_school_id,
        departments.name AS d_name,
        untis_teachers.id AS untis_teacher_id
    FROM users
        INNER JOIN _teachers_to_classes AS t2c ON users.untis_id=t2c."B"
        INNER JOIN untis_classes AS classes ON t2c."A"=classes.id
        INNER JOIN _classes_to_lessons AS c2l ON classes.id=c2l."A"
        INNER JOIN _teachers_to_lessons AS t2l ON users.untis_id=t2l."B"
        INNER JOIN untis_lessons AS lessons ON c2l."B"=lessons.id AND t2l."A"=lessons.id
        INNER JOIN departments ON classes.department_id=departments.id
        INNER JOIN untis_teachers ON users.untis_id=untis_teachers.id
        LEFT JOIN departments AS d_1 ON d_1.id=departments.department1_id
        LEFT JOIN departments AS d_2 ON d_2.id=departments.department2_id;

CREATE OR REPLACE VIEW view__users_teaching_agg AS
    SELECT
        u_id,
        l_semester_id,
        array_agg(DISTINCT c_id) AS class_ids,
        array_agg(DISTINCT c_name) AS class_names,
        array_remove(array_agg(DISTINCT c_name_legacy), NULL) AS legacy_class_names,
        array_agg(DISTINCT l_subject) AS subjects,
        array_agg(DISTINCT d_id) AS department_ids,
        array_remove(array_agg(DISTINCT d_school_id), NULL) AS department_school_ids,
        array_agg(DISTINCT d_name) AS department_names,
        max(CASE WHEN l_subject='KS' OR l_subject='MC' THEN c_name ELSE NULL END) AS klp, -- max returns the maximal/first non null value
        max(CASE WHEN l_subject='KS' OR l_subject='MC' THEN d_id::text ELSE NULL END)::uuid AS klp_department_id
    FROM view__users_teaching
    GROUP BY
        u_id, l_semester_id;


CREATE OR REPLACE VIEW view__events AS
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