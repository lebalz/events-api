-- This is an empty migration.
CREATE VIEW "user_untis_view" AS
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
        lessons.year as l_semester_year,
        lessons.semester as l_semester_nr,
        departments.id AS d_id,
        departments.name AS d_name
    FROM users
        INNER JOIN _teachers_to_classes AS t2c ON users.untis_id=t2c."B"
        INNER JOIN untis_classes AS classes ON t2c."A"=classes.id
        INNER JOIN _classes_to_lessons AS c2l ON classes.id=c2l."A"
        INNER JOIN _teachers_to_lessons AS t2l ON users.untis_id=t2l."B"
        INNER JOIN untis_lessons AS lessons ON c2l."B"=lessons.id AND t2l."A"=lessons.id
        INNER JOIN departments ON classes.department_id=departments.id