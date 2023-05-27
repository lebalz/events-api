import { Prisma } from "@prisma/client"
import { readFileSync } from 'fs';

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
    return Prisma.sql`WITH this AS (
        SELECT
            users.id AS uid,
            users.email, classes.id AS cid,
            classes.name AS cname,
            classes.legacy_name AS cname_legacy,
            lessons.id AS lid,
            lessons.subject,
            lessons.start_hhmm,
            lessons.end_hhmm,
            lessons.week_day,
            lessons.year as semester_year,
            lessons.semester as semester_nr,
            departments.id AS did,
            departments.name AS dname
        FROM users
            INNER JOIN _teachers_to_classes AS t2c ON users.untis_id=t2c."B"
            INNER JOIN untis_classes AS classes ON t2c."A"=classes.id
            INNER JOIN _classes_to_lessons AS c2l ON classes.id=c2l."A"
            INNER JOIN _teachers_to_lessons AS t2l ON users.untis_id=t2l."B"
            INNER JOIN untis_lessons AS lessons ON c2l."B"=lessons.id AND t2l."A"=lessons.id
            INNER JOIN departments ON classes.department_id=departments.id
        WHERE users.id=${userId}
    ),
    /* prepared semesters */
    psemesters AS (
        SELECT
            extract(YEAR FROM semesters.start) AS semester_year, 
            CASE WHEN (extract(month from semesters.start) < 6) 
                THEN 2 
                ELSE 1 
            END AS semester_nr,
            semesters.start,
            semesters.end,
            (
                SELECT COUNT(*) > 0 
                FROM untis_lessons 
                WHERE 
                    untis_lessons.year = extract(YEAR FROM semesters.start) 
                    AND 
                    untis_lessons.semester = CASE WHEN (extract(MONTH FROM semesters.start) < 6) THEN 2 ELSE 1 END
            ) AS is_active
        FROM semesters
    ),
    erange AS (
        SELECT 
            psemesters.semester_year AS semester_year,
            psemesters.semester_nr AS semester_nr,
            psemesters.is_active AS semester_active,
            (CASE WHEN psemesters.is_active THEN psemesters.semester_year ELSE extract(YEAR FROM CURRENT_TIMESTAMP) END) AS join_semester_year,
            (CASE WHEN psemesters.is_active THEN psemesters.semester_nr ELSE CASE WHEN (extract(MONTH FROM CURRENT_TIMESTAMP) < 6) THEN 2 ELSE 1 END END) AS join_semester_nr,
            events.id AS eid, 
            events.classes AS classes,
            events.description,
            events.class_groups AS class_groups,
            events.teachers_only AS teachers_only,
            events.klp_only AS klp_only,
            events.subjects AS subjects,
            array_agg(DISTINCT e2d."A") as department_ids,
            extract(YEAR FROM events.start) AS year_s,
            extract(YEAR FROM events.end) AS year_e,
            extract(DOW  FROM events.start) AS start_week_day,
            extract(HOUR FROM events.start) * 60 + extract(MINUTE FROM events.start) AS start_offset_m,
            CEIL(extract(EPOCH FROM AGE(events.end, events.start)) / 60) AS duration_m
            FROM events 
                INNER JOIN psemesters ON events.start < psemesters.end AND events.end > psemesters.start
                LEFT JOIN _events_to_departments AS e2d ON events.id=e2d."B"
            WHERE events.state = 'PUBLISHED'
                AND (
                    events.start < ${end} /* (current_timestamp + interval '6 month') */
                    AND
                    events.end > ${start} /* (current_timestamp - interval '1 month') */
                )
            /* group by everything except department_ids... */
            GROUP BY 
                semester_year,
                semester_nr,
                is_active,
                eid,
                classes,
                class_groups,
                teachers_only,
                klp_only,
                subjects,
                year_s,
                year_e,
                start_week_day,
                start_offset_m,
                duration_m,
                description
    ), this_aggr AS (
        SELECT
            semester_year,
            semester_nr,
            array_agg(DISTINCT cname) AS my_classes,
            array_agg(DISTINCT cname_legacy) AS legacy_classes,
            array_agg(DISTINCT subject) AS subjects,
            array_agg(DISTINCT did) AS department_ids
        FROM this
        GROUP BY
            semester_year,
            semester_nr
    )
    SELECT * FROM events
    WHERE id IN (
            SELECT DISTINCT eid
            FROM erange
                INNER JOIN this_aggr ON erange.join_semester_year = this_aggr.semester_year AND erange.join_semester_nr = this_aggr.semester_nr
                INNER JOIN this ON erange.join_semester_year = this.semester_year AND erange.join_semester_nr = this.semester_nr
            WHERE
                /* departments ac*/
                (erange.department_ids && this_aggr.department_ids)
                OR (
                    (
                        /* overlapping exact class names aa*/
                        ((erange.classes && this_aggr.my_classes) OR (erange.classes && this_aggr.legacy_classes))
                        OR
                        /* class name in class_group ab*/
                        array_to_string(this_aggr.my_classes, ':::') SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], erange.class_groups), '|','--'), ')%')
                        OR
                        /* subjects ad*/
                        array_to_string(this_aggr.subjects, ':::') SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], erange.subjects), '|','--'), ')')
                    )
                    AND
                    (
                        /* & klp ba*/
                        (erange.klp_only AND Array['KS', 'MC']::text[] && this_aggr.subjects)
                        OR 
                        /* & only teachers bb*/
                        (NOT erange.klp_only AND erange.teachers_only)
                        OR
                        /* & only overlapping lessons of class bc */
                        (
                            NOT (erange.teachers_only OR erange.klp_only OR NOT erange.semester_active)
                            AND (
                                this.cname in (select unnest(erange.classes))
                                OR
                                this.cname LIKE ANY (SELECT CONCAT(unnest(erange.class_groups), '%'))
                            )
                            AND (MOD((this.week_day - erange.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(this.start_hhmm / 100) * 60 + MOD(this.start_hhmm, 100)) < erange.start_offset_m + erange.duration_m
                            AND (MOD((this.week_day - erange.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(this.end_hhmm / 100) * 60 + MOD(this.end_hhmm, 100)) > erange.start_offset_m
                        )
                    )
                )
    )`
}

export default query;