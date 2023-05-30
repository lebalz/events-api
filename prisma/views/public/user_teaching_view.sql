SELECT
  user_untis_view.l_semester_year,
  user_untis_view.l_semester_nr,
  array_agg(DISTINCT user_untis_view.c_id) AS class_ids,
  array_agg(DISTINCT user_untis_view.c_name) AS class_names,
  array_agg(DISTINCT user_untis_view.c_name_legacy) AS legacy_class_names,
  array_agg(DISTINCT user_untis_view.l_subject) AS subjects,
  array_agg(DISTINCT user_untis_view.d_id) AS department_ids,
  array_agg(DISTINCT user_untis_view.d_name) AS department_names
FROM
  user_untis_view
GROUP BY
  user_untis_view.l_semester_year,
  user_untis_view.l_semester_nr;