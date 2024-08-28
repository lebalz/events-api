SELECT
  DISTINCT ON (
    view__affected_by_events.u_id,
    view__affected_by_events.s_id,
    view__affected_by_events.e_id
  ) view__affected_by_events.u_id,
  view__affected_by_events.s_id,
  EVENTS.id,
  EVENTS.author_id,
  EVENTS.start,
  EVENTS."end",
  EVENTS.location,
  EVENTS.description,
  EVENTS.description_long,
  EVENTS.state,
  EVENTS.import_id,
  EVENTS.classes,
  EVENTS.class_groups,
  EVENTS.created_at,
  EVENTS.updated_at,
  EVENTS.deleted_at,
  EVENTS.teaching_affected,
  EVENTS.parent_id,
  EVENTS.cloned,
  EVENTS.audience,
  EVENTS.affects_department2,
  EVENTS.meta
FROM
  (
    view__affected_by_events
    JOIN EVENTS ON ((view__affected_by_events.e_id = EVENTS.id))
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
      ) THEN (
        view__affected_by_events.affects_lesson
        OR view__affected_by_events.is_klp
      )
      WHEN (
        view__affected_by_events.e_audience = 'KLP' :: "EventAudience"
      ) THEN view__affected_by_events.is_klp
      WHEN (
        view__affected_by_events.e_audience = ANY (
          ARRAY ['LP'::"EventAudience", 'ALL'::"EventAudience"]
        )
      ) THEN TRUE
      ELSE false
    END
  );