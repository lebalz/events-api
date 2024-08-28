SELECT
  DISTINCT ON (
    untis_classes.id,
    untis_teachers.id,
    untis_lessons.semester_id
  ) users.id AS u_id,
  untis_teachers.id AS t_id,
  untis_teachers.name AS t_name,
  untis_classes.id AS c_id,
  untis_classes.name AS c_name,
  untis_lessons.semester_id AS s_id
FROM
  (
    (
      (
        (
          (
            untis_teachers
            JOIN _teachers_to_lessons ON ((untis_teachers.id = _teachers_to_lessons."B"))
          )
          JOIN untis_lessons ON ((_teachers_to_lessons."A" = untis_lessons.id))
        )
        JOIN _classes_to_lessons ON ((untis_lessons.id = _classes_to_lessons."B"))
      )
      JOIN untis_classes ON ((_classes_to_lessons."A" = untis_classes.id))
    )
    LEFT JOIN users ON ((untis_teachers.id = users.untis_id))
  )
WHERE
  (
    untis_lessons.subject = ANY (ARRAY ['KS'::text, 'MC'::text])
  );