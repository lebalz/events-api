-- This is an empty migration.
DROP VIEW IF EXISTS users_teaching_view;
CREATE OR REPLACE VIEW users_teaching_view AS
    SELECT
        u_id,
        l_semester_id,
        array_agg(DISTINCT c_id) AS class_ids,
        array_agg(DISTINCT c_name) AS class_names,
        array_agg(DISTINCT c_name_legacy) AS legacy_class_names,
        array_agg(DISTINCT l_subject) AS subjects,
        array_agg(DISTINCT d_id) AS department_ids,
        array_agg(DISTINCT d_name) AS department_names,
        string_agg(CASE WHEN l_subject='KS' OR l_subject='MC' THEN c_name ELSE NULL END, '') AS klp,
        string_agg(CASE WHEN l_subject='KS' OR l_subject='MC' THEN c_name_legacy ELSE NULL END, '') AS klp_legacy
    FROM users_untis_view
    GROUP BY
        u_id, l_semester_id;