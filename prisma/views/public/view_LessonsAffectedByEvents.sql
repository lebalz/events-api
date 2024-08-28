SELECT
  DISTINCT ON (
    view__affected_by_events.e_id,
    view__affected_by_events.s_id,
    untis_lessons.id
  ) view__affected_by_events.e_id,
  view__affected_by_events.s_id,
  untis_lessons.id,
  untis_lessons.room,
  untis_lessons.subject,
  untis_lessons.description,
  untis_lessons.semester_nr,
  untis_lessons.year,
  untis_lessons.week_day,
  untis_lessons.start_hhmm,
  untis_lessons.end_hhmm,
  untis_lessons.semester_id,
  array_agg(
    DISTINCT view__affected_by_events.untis_teacher_id
  ) AS teacher_ids,
  array_agg(DISTINCT view__affected_by_events.c_id) AS class_ids
FROM
  (
    view__affected_by_events
    JOIN untis_lessons ON (
      (view__affected_by_events.l_id = untis_lessons.id)
    )
  )
WHERE
  (
    (
      view__affected_by_events.affects_department
      OR view__affected_by_events.affects_classname
      OR view__affected_by_events.affects_classgroup
    )
    AND CASE
      WHEN (
        view__affected_by_events.e_audience = 'STUDENTS' :: "EventAudience"
      ) THEN view__affected_by_events.affects_lesson
      WHEN (
        view__affected_by_events.e_audience = 'ALL' :: "EventAudience"
      ) THEN TRUE
      ELSE false
    END
  )
GROUP BY
  view__affected_by_events.e_id,
  view__affected_by_events.s_id,
  untis_lessons.id;