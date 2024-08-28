SELECT
  EVENTS.id AS e_id,
  users.id AS u_id,
  semesters.id AS s_id,
  untis_teachers.id AS untis_teacher_id,
  untis_classes.id AS c_id,
  untis_classes.name AS c_name,
  untis_lessons.id AS l_id,
  untis_lessons.subject AS l_subject,
  EVENTS.audience AS e_audience,
  CASE
    WHEN (classes_department.id = events_department.id) THEN events_department.id
    ELSE NULL :: uuid
  END AS affected_department_id,
  CASE
    WHEN (classes_department.id = events_department.id) THEN CASE
      WHEN EVENTS.affects_department2 THEN TRUE
      WHEN (
        EVENTS.audience = ANY (
          ARRAY ['KLP'::"EventAudience", 'STUDENTS'::"EventAudience"]
        )
      ) THEN TRUE
      WHEN (events_department.department1_id IS NULL) THEN CASE
        WHEN (
          untis_lessons.subject ~ '^(SF|SM|EF.*|SPF|SPH|OC.*|MU|BG)$' :: text
        ) THEN (
          (
            (
              lower(classes_department.letter) = classes_department.letter
            )
            AND (upper(untis_teachers.name) = untis_teachers.name)
          )
          OR (
            (
              upper(classes_department.letter) = classes_department.letter
            )
            AND (lower(untis_teachers.name) = untis_teachers.name)
          )
        )
        ELSE TRUE
      END
      ELSE (
        (
          classes_department.department1_id = events_department.department1_id
        )
        AND (
          (
            (
              lower(classes_department.letter) = classes_department.letter
            )
            AND (upper(untis_teachers.name) = untis_teachers.name)
          )
          OR (
            (
              upper(classes_department.letter) = classes_department.letter
            )
            AND (lower(untis_teachers.name) = untis_teachers.name)
          )
        )
      )
    END
    ELSE false
  END AS affects_department,
  CASE
    WHEN (
      EVENTS.affects_department2
      OR CASE
        WHEN (
          untis_lessons.subject ~ '^(SF|SM|EF.*|SPF|SPH|OC.*|MU|BG)$' :: text
        ) THEN (
          (
            (
              lower(classes_department.letter) = classes_department.letter
            )
            AND (upper(untis_teachers.name) = untis_teachers.name)
          )
          OR (
            (
              upper(classes_department.letter) = classes_department.letter
            )
            AND (lower(untis_teachers.name) = untis_teachers.name)
          )
        )
        ELSE TRUE
      END
    ) THEN (EVENTS.classes @ > ARRAY [untis_classes.name])
    ELSE false
  END AS affects_classname,
  CASE
    WHEN (
      EVENTS.affects_department2
      OR CASE
        WHEN (
          untis_lessons.subject ~ '^(SF|SM|EF.*|SPF|SPH|OC.*|MU|BG)$' :: text
        ) THEN (
          (
            (
              lower(classes_department.letter) = classes_department.letter
            )
            AND (upper(untis_teachers.name) = untis_teachers.name)
          )
          OR (
            (
              upper(classes_department.letter) = classes_department.letter
            )
            AND (lower(untis_teachers.name) = untis_teachers.name)
          )
        )
        ELSE TRUE
      END
    ) THEN (
      untis_classes.name ~ (
        (
          '^(' :: text || array_to_string(
            array_cat(ARRAY [':::'::text], EVENTS.class_groups),
            '|' :: text
          )
        ) || ')' :: text
      )
    )
    ELSE false
  END AS affects_classgroup,
  CASE
    WHEN (EVENTS.audience = 'STUDENTS' :: "EventAudience") THEN (
      (
        (
          (
            (
              (
                (
                  mod(
                    (
                      (
                        (
                          (untis_lessons.week_day) :: numeric - EXTRACT(
                            dow
                            FROM
                              EVENTS.start
                          )
                        ) + (7) :: numeric
                      )
                    ) :: integer,
                    7
                  ) * 24
                ) * 60
              )
            ) :: double precision + (
              floor(
                ((untis_lessons.start_hhmm / 100)) :: double precision
              ) * (60) :: double precision
            )
          ) + (mod(untis_lessons.start_hhmm, 100)) :: double precision
        ) < (
          (
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
            ) + ceil(
              (
                EXTRACT(
                  epoch
                  FROM
                    age(EVENTS."end", EVENTS.start)
                ) / (60) :: numeric
              )
            )
          )
        ) :: double precision
      )
      AND (
        (
          (
            (
              (
                (
                  mod(
                    (
                      (
                        (
                          (untis_lessons.week_day) :: numeric - EXTRACT(
                            dow
                            FROM
                              EVENTS.start
                          )
                        ) + (7) :: numeric
                      )
                    ) :: integer,
                    7
                  ) * 24
                ) * 60
              )
            ) :: double precision + (
              floor(
                ((untis_lessons.end_hhmm / 100)) :: double precision
              ) * (60) :: double precision
            )
          ) + (mod(untis_lessons.end_hhmm, 100)) :: double precision
        ) > (
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
          )
        ) :: double precision
      )
    )
    ELSE false
  END AS affects_lesson,
  (view__klps.u_id = users.id) AS is_klp
FROM
  (
    (
      (
        (
          (
            (
              (
                (
                  (
                    (
                      (
                        untis_lessons
                        JOIN _teachers_to_lessons ON ((untis_lessons.id = _teachers_to_lessons."A"))
                      )
                      JOIN untis_teachers ON ((_teachers_to_lessons."B" = untis_teachers.id))
                    )
                    JOIN users ON ((untis_teachers.id = users.untis_id))
                  )
                  JOIN _classes_to_lessons ON ((untis_lessons.id = _classes_to_lessons."B"))
                )
                JOIN untis_classes ON ((_classes_to_lessons."A" = untis_classes.id))
              )
              JOIN semesters ON ((untis_lessons.semester_id = semesters.id))
            )
            JOIN departments classes_department ON (
              (
                untis_classes.department_id = classes_department.id
              )
            )
          )
          LEFT JOIN view__klps ON (
            (
              (untis_classes.id = view__klps.c_id)
              AND (untis_lessons.semester_id = view__klps.s_id)
            )
          )
        )
        CROSS JOIN EVENTS
      )
      LEFT JOIN _events_to_departments ON ((EVENTS.id = _events_to_departments."B"))
    )
    LEFT JOIN departments events_department ON (
      (
        _events_to_departments."A" = events_department.id
      )
    )
  )
WHERE
  (
    (
      (EVENTS.start >= semesters.start)
      AND (EVENTS.start <= semesters."end")
    )
    OR (
      (EVENTS."end" >= semesters.start)
      AND (EVENTS."end" <= semesters."end")
    )
  );