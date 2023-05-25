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
    return Prisma.sql`WITH this as (
        select users.id as uid, users.email, classes.id as cid, classes.name as cname, classes.legacy_name as cname_legacy, lessons.id as lid, lessons.subject, lessons.start_hhmm, lessons.end_hhmm, lessons.week_day, lessons.year, lessons.semester, departments.id as did, departments.name as dname
        FROM users
            inner join _teachers_to_classes as t2c ON users.untis_id=t2c."B"
            inner join untis_classes AS classes ON t2c."A"=classes.id
            inner join _classes_to_lessons as c2l ON classes.id=c2l."A"
            inner join _teachers_to_lessons as t2l ON users.untis_id=t2l."B"
            inner join untis_lessons AS lessons ON c2l."B"=lessons.id AND t2l."A"=lessons.id
            inner join departments on classes.department_id=departments.id
        WHERE users.id=${userId}
    ), erange AS (
        SELECT 
            extract(year from semesters.start) as semester_year, 
            case when (extract(month from semesters.start) < 6) 
                then 2 
                else 1 
            end as semester_nr, 
            events.id AS eid, 
            events.classes AS classes,
            events.description,
            events.class_groups AS class_groups,
            events.teachers_only as teachers_only,
            events.klp_only as klp_only,
            events.subjects as subjects,
            array_agg(distinct e2d."A") as department_ids,
            extract(year FROM events.start) AS year_s,
            extract(year FROM events.end) AS year_e,
            extract(dow  FROM events.start) AS start_week_day,
            extract(hour FROM events.start) * 60 + extract(MINUTE FROM events.start) AS start_offset_m,
            CEIL(extract(EPOCH FROM AGE(events.end, events.start)) / 60) AS duration_m
            /* day of week                  +       event duration in full days  */
            FROM events 
                inner join semesters on events.start < semesters.end and events.end > semesters.start
                left join _events_to_departments as e2d on events.id=e2d."B"
            WHERE events.state = 'PUBLISHED'
                AND (
                    events.start < ${end} /* (current_timestamp + interval '6 month') */
                    AND
                    events.end > ${start} /* (current_timestamp - interval '1 month') */
                )
            /* group by everything except department_ids... */
            group by semester_year, semester_nr, eid, classes, class_groups, teachers_only, klp_only, subjects, year_s, year_e, start_week_day, start_offset_m, duration_m, description
    ), this_aggr AS (
        select year, semester, array_agg(distinct cname) as my_classes, array_agg(distinct cname_legacy) as legacy_classes, array_agg(distinct subject) as subjects, array_agg(distinct did) as department_ids
        from this 
        group by year, semester
    )
    select * from events
    where id in (
            select distinct eid 
                from erange 
                    inner join this_aggr on erange.semester_year = this_aggr.year and erange.semester_nr = this_aggr.semester
                    inner join this on erange.semester_year = this.year and erange.semester_nr = this.semester
            where
                
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
                            NOT (erange.teachers_only OR erange.klp_only)
                            AND (MOD((this.week_day - erange.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(this.start_hhmm / 100) * 60 + MOD(this.start_hhmm, 100)) < erange.start_offset_m + erange.duration_m
                            AND (MOD((this.week_day - erange.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(this.end_hhmm / 100) * 60 + MOD(this.end_hhmm, 100)) > erange.start_offset_m
                        )
                    )
                )
    )`
}

export default query;