SELECT
    u_id,
    l_semester_id,
    array_agg(DISTINCT c_id) AS class_ids,
    array_agg(DISTINCT c_name) AS class_names,
    array_remove(array_agg(DISTINCT c_name_legacy), NULL) AS legacy_class_names,
    array_remove(array_agg(DISTINCT (CASE WHEN ((l_subject LIKE 'EF%' AND LOWER(d_letter)=d_letter) OR (l_subject LIKE 'OC%'  AND UPPER(d_letter)=d_letter)) THEN NULL ELSE c_name END)), NULL) AS class_names_monolingue,
    array_agg(DISTINCT l_subject) AS subjects,
    array_agg(DISTINCT d_id) AS department_ids,
    array_remove(array_agg(DISTINCT d_school_id), NULL) AS department_school_ids,
    array_agg(DISTINCT d_name) AS department_names,
    max(CASE WHEN l_subject='KS' OR l_subject='MC' THEN c_name ELSE NULL END) AS klp, -- max returns the maximal/first non null value
    max(CASE WHEN l_subject='KS' OR l_subject='MC' THEN d_id::text ELSE NULL END)::uuid AS klp_department_id
FROM view__users_teaching
GROUP BY
    u_id, l_semester_id;