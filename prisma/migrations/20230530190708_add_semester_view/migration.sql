-- This is an empty migration.

-- This is an empty migration.
CREATE VIEW semester_view AS
    SELECT
        id,
        name,
        extract(YEAR FROM semesters.start) AS semester_year, 
        CASE WHEN (extract(month from semesters.start) < 6) 
            THEN 2 
            ELSE 1 
        END AS semester_nr,
        semesters.start,
        semesters.end,
        (
            SELECT COUNT(*) > 0 
            FROM untis_lessons 
            WHERE 
                untis_lessons.year = extract(YEAR FROM semesters.start) 
                AND 
                untis_lessons.semester = CASE WHEN (extract(MONTH FROM semesters.start) < 6) THEN 2 ELSE 1 END
        ) AS has_lessons,
        CURRENT_TIMESTAMP BETWEEN semesters.start AND semesters.end AS is_current
    FROM semesters