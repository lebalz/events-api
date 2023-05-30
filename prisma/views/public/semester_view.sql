SELECT
  semesters.id,
  semesters.name,
  EXTRACT(
    year
    FROM
      semesters.start
  ) AS semester_year,
  CASE
    WHEN (
      EXTRACT(
        MONTH
        FROM
          semesters.start
      ) < (6) :: numeric
    ) THEN 2
    ELSE 1
  END AS semester_nr,
  semesters.start,
  semesters."end",
  (
    SELECT
      (count(*) > 0)
    FROM
      untis_lessons
    WHERE
      (
        (
          (untis_lessons.year) :: numeric = EXTRACT(
            year
            FROM
              semesters.start
          )
        )
        AND (
          untis_lessons.semester = CASE
            WHEN (
              EXTRACT(
                MONTH
                FROM
                  semesters.start
              ) < (6) :: numeric
            ) THEN 2
            ELSE 1
          END
        )
      )
  ) AS has_lessons,
  (
    (CURRENT_TIMESTAMP >= semesters.start)
    AND (CURRENT_TIMESTAMP <= semesters."end")
  ) AS is_current
FROM
  semesters;