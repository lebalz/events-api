import { Prisma } from "@prisma/client"
interface RelTR { 
    type: 'relative', 
    monthForward: number, 
    monthBackward: number 
}
interface AbsTR { 
    type: 'absolute', 
    from: Date, 
    to: Date 
}
const query = (userId: string, timerange: RelTR | AbsTR) => {
    const start = timerange.type === 'relative' ? Prisma.sql`(current_timestamp - interval '${timerange.monthBackward} month')` : timerange.from
    const end = timerange.type === 'relative' ? Prisma.sql`(current_timestamp + interval '${timerange.monthForward} month')` : timerange.to
    return Prisma.sql`
        SELECT DISTINCT events.*
        FROM events_view
            INNER JOIN users_teaching_view ON events_view.s_id = users_teaching_view.l_semester_id
            INNER JOIN users_untis_view ON events_view.s_id = users_untis_view.l_semester_id
            INNER JOIN events ON events.id = events_view.e_id
        WHERE
            users_untis_view.u_id=${userId}::uuid
        AND
            users_teaching_view.u_id=${userId}::uuid
        AND
            events_view.state = 'PUBLISHED'
        AND
            events_view.parent_id IS NULL
        AND (
            events_view.start < ${end} /* (current_timestamp + interval '6 month') */
            AND
            events_view.end > ${start} /* (current_timestamp - interval '1 month') */
        )
        AND (
            /* departments: note: {NULL} && {NULL} evaluates to false */
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
                            AND (
                                users_untis_view.c_name in (select unnest(events_view.classes))
                                OR
                                users_untis_view.c_name LIKE ANY (SELECT CONCAT(unnest(events_view.class_groups), '%'))
                            )
                            AND (MOD((users_untis_view.l_week_day - events_view.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(users_untis_view.l_start_hhmm / 100) * 60 + MOD(users_untis_view.l_start_hhmm, 100)) < events_view.start_offset_m + events_view.duration_m
                            AND (MOD((users_untis_view.l_week_day - events_view.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(users_untis_view.l_end_hhmm / 100) * 60 + MOD(users_untis_view.l_end_hhmm, 100)) > events_view.start_offset_m
                        )
                    OR
                        /* & overlapping subjects */
                        events_view.subjects && users_teaching_view.subjects
                )
            )
        )
    `
}

export default query;