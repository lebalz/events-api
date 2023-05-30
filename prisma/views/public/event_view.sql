SELECT
  semester_view.id AS s_id,
  semester_view.semester_year AS s_year,
  semester_view.semester_nr AS s_nr,
  semester_view.has_lessons AS s_active,
  CASE
    WHEN semester_view.has_lessons THEN semester_view.semester_year
    ELSE EXTRACT(
      year
      FROM
        CURRENT_TIMESTAMP
    )
  END AS join_semester_year,
  CASE
    WHEN semester_view.has_lessons THEN semester_view.semester_nr
    ELSE CASE
      WHEN (
        EXTRACT(
          MONTH
          FROM
            CURRENT_TIMESTAMP
        ) < (6) :: numeric
      ) THEN 2
      ELSE 1
    END
  END AS join_semester_nr,
  EVENTS.id AS e_id,
  EVENTS.classes,
  EVENTS.description,
  EVENTS.class_groups,
  EVENTS.teachers_only,
  EVENTS.klp_only,
  EVENTS.subjects,
  array_agg(DISTINCT e2d."A") AS department_ids,
  EXTRACT(
    year
    FROM
      EVENTS.start
  ) AS year_s,
  EXTRACT(
    year
    FROM
      EVENTS."end"
  ) AS year_e,
  EXTRACT(
    dow
    FROM
      EVENTS.start
  ) AS start_week_day,
  EXTRACT(
    dow
    FROM
      EVENTS."end"
  ) AS end_week_day,
  (
    (
      EXTRACT(
        HOUR
        FROM
          EVENTS.start
      ) * (60) :: numeric
    ) + EXTRACT(
      MINUTE
      FROM
        EVENTS.start
    )
  ) AS start_offset_m,
  (
    (
      EXTRACT(
        HOUR
        FROM
          EVENTS."end"
      ) * (60) :: numeric
    ) + EXTRACT(
      MINUTE
      FROM
        EVENTS."end"
    )
  ) AS end_offset_m,
  ceil(
    (
      EXTRACT(
        epoch
        FROM
          age(EVENTS."end", EVENTS.start)
      ) / (60) :: numeric
    )
  ) AS duration_m
FROM
  (
    (
      EVENTS
      JOIN semester_view ON (
        (
          (EVENTS.start < semester_view."end")
          AND (EVENTS."end" > semester_view.start)
        )
      )
    )
    LEFT JOIN _events_to_departments e2d ON ((EVENTS.id = e2d."B"))
  )
GROUP BY
  semester_view.id,
  semester_view.semester_year,
  semester_view.semester_nr,
  semester_view.has_lessons,
  EVENTS.id,
  EVENTS.classes,
  EVENTS.class_groups,
  EVENTS.teachers_only,
  EVENTS.klp_only,
  EVENTS.subjects,
  (
    EXTRACT(
      year
      FROM
        EVENTS.start
    )
  ),
  (
    EXTRACT(
      year
      FROM
        EVENTS."end"
    )
  ),
  (
    EXTRACT(
      dow
      FROM
        EVENTS.start
    )
  ),
  (
    (
      EXTRACT(
        HOUR
        FROM
          EVENTS.start
      ) * (60) :: numeric
    ) + EXTRACT(
      MINUTE
      FROM
        EVENTS.start
    )
  ),
  (
    ceil(
      (
        EXTRACT(
          epoch
          FROM
            age(EVENTS."end", EVENTS.start)
        ) / (60) :: numeric
      )
    )
  ),
  EVENTS.description;