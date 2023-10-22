-- This is an empty migration.
DROP VIEW IF EXISTS view__users_affected_by_events;
DROP VIEW IF EXISTS view__lessons_affected_by_events;
DROP VIEW IF EXISTS view__affected_by_events;

CREATE OR REPLACE VIEW view__affected_by_events AS
    SELECT DISTINCT
        users_untis_view.u_id AS u_id,
        events_view.e_id AS e_id,
        events_view.s_id AS s_id,
        users_untis_view.c_id AS c_id,
        users_untis_view.l_id AS l_id
    FROM events_view
        INNER JOIN users_teaching_view ON events_view.s_id = users_teaching_view.l_semester_id
        INNER JOIN users_untis_view ON events_view.s_id = users_untis_view.l_semester_id
    WHERE
        users_untis_view.u_id=users_teaching_view.u_id
    AND (
            /* Info note: {NULL} && {NULL} evaluates to false */
            (events_view.department_ids && users_teaching_view.department_ids)
        OR (
            (
                    /* overlapping exact class names */
                    ((events_view.classes && users_teaching_view.class_names) OR (events_view.classes && users_teaching_view.legacy_class_names))
                OR
                    /* class name in class_group */
                    /* array_cat: concat's multiple arrays; array_to_string(<array>, <join-value>, <when-null-value>) 
                                --> class_groups: [] --> %(--)%
                                --> class_groups: [24G] --> %(--|24G)%
                                --> class_groups: [24G, 26m] --> %(--|24G|26m)%
                    */
                    array_to_string(users_teaching_view.class_names, ':::') SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events_view.class_groups), '|','--'), ')%')
                OR
                    /* subjects */
                    array_to_string(users_teaching_view.subjects, ':::') SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events_view.subjects), '|','--'), ')%')
            )
            AND (
                    /* & klp */
                    (events_view.audience = 'KLP' AND users_teaching_view.klp IS NOT NULL AND (
                            /* overlapping departments */
                            (users_teaching_view.klp_department_id = ANY(events_view.department_ids))
                        OR
                            /* overlapping exact class names */
                            (users_teaching_view.klp = ANY(events_view.classes))
                        OR
                            /* overlapping class groups */
                            (users_teaching_view.klp SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], events_view.class_groups), '|','--'), ')%'))
                    ))
                OR 
                    /* & only teachers */
                    (events_view.audience = 'LP')
                OR  
                    /* & every teacher of the class and the students of the class */
                    (events_view.audience='ALL')
                OR
                    /* & only overlapping lessons of class */
                    (
                        (events_view.audience='STUDENTS' OR events_view.audience='ALL')
                    AND 
                        (
                            (
                                (
                                    users_untis_view.c_name in (select unnest(events_view.classes))
                                    OR
                                    users_untis_view.c_name LIKE ANY (SELECT CONCAT(unnest(events_view.class_groups), '%'))
                                )
                                AND (MOD((users_untis_view.l_week_day - events_view.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(users_untis_view.l_start_hhmm / 100) * 60 + MOD(users_untis_view.l_start_hhmm, 100)) < events_view.start_offset_m + events_view.duration_m
                                AND (MOD((users_untis_view.l_week_day - events_view.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(users_untis_view.l_end_hhmm / 100) * 60 + MOD(users_untis_view.l_end_hhmm, 100)) > events_view.start_offset_m
                            )
                        OR 
                            (
                                users_teaching_view.klp IS NOT NULL
                            AND 
                                (
                                    /* overlapping departments */
                                    (users_teaching_view.klp_department_id = ANY(events_view.department_ids))
                                OR
                                    /* overlapping exact class names */
                                    (users_teaching_view.klp = ANY(events_view.classes))
                                OR
                                    /* overlapping class groups */
                                    (users_teaching_view.klp SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], events_view.class_groups), '|','--'), ')%'))
                                )
                            )
                        )
                    )
                OR
                    /* & overlapping subjects */
                    (events_view.subjects && users_teaching_view.subjects)
            )
        )
    );

CREATE OR REPLACE VIEW view__users_affected_by_events AS
    SELECT DISTINCT u_id, s_id, events.*
        FROM view__affected_by_events
            INNER JOIN events ON view__affected_by_events.e_id = events.id;

CREATE OR REPLACE VIEW view__lessons_affected_by_events AS
    SELECT DISTINCT e_id, s_id, untis_lessons.*
        FROM view__affected_by_events
            INNER JOIN untis_lessons ON view__affected_by_events.l_id = untis_lessons.id;