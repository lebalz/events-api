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
    departments.letter AS d_letter,
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