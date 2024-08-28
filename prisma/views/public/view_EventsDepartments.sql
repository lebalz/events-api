SELECT
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
  EVENTS.meta,
  e2d."A" AS d_id
FROM
  (
    EVENTS
    JOIN _events_to_departments e2d ON ((e2d."B" = EVENTS.id))
  )
UNION
SELECT
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
  EVENTS.meta,
  untis_classes.department_id AS d_id
FROM
  (
    EVENTS
    JOIN untis_classes ON ((untis_classes.name = ANY (EVENTS.classes)))
  )
UNION
SELECT
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
  EVENTS.meta,
  untis_classes.department_id AS d_id
FROM
  (
    EVENTS
    JOIN untis_classes ON (
      (
        untis_classes.name ~ similar_to_escape(
          concat(
            '%(',
            array_to_string(
              array_cat(ARRAY [NULL::text], EVENTS.class_groups),
              '|' :: text,
              '--' :: text
            ),
            ')%'
          )
        )
      )
    )
  );