SELECT
  view__affected_by_events_unfiltered.e_id,
  view__affected_by_events_unfiltered.u_id,
  view__affected_by_events_unfiltered.s_id,
  view__affected_by_events_unfiltered.untis_teacher_id,
  view__affected_by_events_unfiltered.c_id,
  view__affected_by_events_unfiltered.c_name,
  view__affected_by_events_unfiltered.l_id,
  view__affected_by_events_unfiltered.l_subject,
  view__affected_by_events_unfiltered.e_audience,
  view__affected_by_events_unfiltered.affected_department_id,
  view__affected_by_events_unfiltered.affects_department,
  view__affected_by_events_unfiltered.affects_classname,
  view__affected_by_events_unfiltered.affects_classgroup,
  view__affected_by_events_unfiltered.affects_lesson,
  view__affected_by_events_unfiltered.is_klp
FROM
  view__affected_by_events_unfiltered
WHERE
  (
    view__affected_by_events_unfiltered.affects_department
    OR view__affected_by_events_unfiltered.affects_classname
    OR view__affected_by_events_unfiltered.affects_classgroup
  );