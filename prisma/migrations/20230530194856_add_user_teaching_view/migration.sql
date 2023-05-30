-- This is an empty migration.
CREATE VIEW user_teaching_view AS
    SELECT
        l_semester_year,
        l_semester_nr,
        array_agg(DISTINCT c_id) AS class_ids,
        array_agg(DISTINCT c_name) AS class_names,
        array_agg(DISTINCT c_name_legacy) AS legacy_class_names,
        array_agg(DISTINCT l_subject) AS subjects,
        array_agg(DISTINCT d_id) AS department_ids,
        array_agg(DISTINCT d_name) AS department_names
    FROM user_untis_view
    GROUP BY
        l_semester_year,
        l_semester_nr