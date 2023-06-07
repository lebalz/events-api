import { Prisma } from "@prisma/client"
import { readFileSync } from 'fs';
import prisma from "../../prisma";

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
            events_view.state = 'PUBLISHED'
        AND (
            events_view.start < ${end} /* (current_timestamp + interval '6 month') */
            AND
            events_view.end > ${start} /* (current_timestamp - interval '1 month') */
        )
        AND (
            /* departments ac*/
            (events_view.department_ids && users_teaching_view.department_ids)
            OR (
                (
                    /* overlapping exact class names aa*/
                    ((events_view.classes && users_teaching_view.class_names) OR (events_view.classes && users_teaching_view.legacy_class_names))
                    OR
                    /* class name in class_group ab*/
                    array_to_string(users_teaching_view.class_names, ':::') SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], events_view.class_groups), '|','--'), ')%')
                    OR
                    /* subjects ad*/
                    array_to_string(users_teaching_view.subjects, ':::') SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], events_view.subjects), '|','--'), ')')
                )
                AND (
                    /* & klp ba*/
                    (events_view.klp_only AND Array['KS', 'MC']::text[] && users_teaching_view.subjects)
                    OR 
                    /* & only teachers bb*/
                    (NOT events_view.klp_only AND events_view.teachers_only)
                    OR
                    /* & only overlapping lessons of class bc */
                    (
                        NOT (events_view.teachers_only OR events_view.klp_only)
                        AND (
                            users_untis_view.c_name in (select unnest(events_view.classes))
                            OR
                            users_untis_view.c_name LIKE ANY (SELECT CONCAT(unnest(events_view.class_groups), '%'))
                        )
                        AND (MOD((users_untis_view.l_week_day - events_view.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(users_untis_view.l_start_hhmm / 100) * 60 + MOD(users_untis_view.l_start_hhmm, 100)) < events_view.start_offset_m + events_view.duration_m
                        AND (MOD((users_untis_view.l_week_day - events_view.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(users_untis_view.l_end_hhmm / 100) * 60 + MOD(users_untis_view.l_end_hhmm, 100)) > events_view.start_offset_m
                    )
                )
            )
        )
    `
}

export default query;