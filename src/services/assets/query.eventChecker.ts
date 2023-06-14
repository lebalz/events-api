import { Prisma } from "@prisma/client"

const query = (eventId: string, userId?: string) => {
    return Prisma.sql`WITH drange AS (
        SELECT 
            events.id AS id, 
            events.classes AS classes,
            events.class_groups AS class_groups,
            extract(year FROM events.start) AS year_s,
            extract(year FROM events.end) AS year_e,
            extract(dow  FROM events.start) AS week_day,
            extract(hour FROM events.start) * 60 + extract(MINUTE  FROM  events.start) AS start_offset_m,
            CEIL(extract(EPOCH  FROM  age(events.end, events.start)) / 60) AS duration_m,
            CEIL(extract(EPOCH  FROM  age(events.end, events.start)) / 60 / 60 / 24 / 7) AS duration_w
            FROM events WHERE events.id=${eventId}::uuid AND (
                events.state='PUBLISHED'
                OR events.author_id=${userId}::uuid
                OR 'ADMIN' = (SELECT users.role FROM users WHERE id=${userId}::uuid)
            )
    ) 
    SELECT untis_lessons.*, untis_teachers.name as teacher_name, untis_classes.name as class_name
    FROM  untis_lessons
        INNER JOIN _classes_to_lessons ON untis_lessons.id=_classes_to_lessons."B"
        INNER JOIN untis_classes ON _classes_to_lessons."A" = untis_classes.id
        INNER JOIN _teachers_to_lessons ON untis_lessons.id=_teachers_to_lessons."A"
        INNER JOIN untis_teachers ON _teachers_to_lessons."B" = untis_teachers.id,
        drange /* append calculated values to each row for easier access*/
    where
            untis_lessons.year BETWEEN drange.year_s AND drange.year_e
            AND (MOD((untis_lessons.week_day + drange.duration_w * 7 - drange.week_day)::INTEGER, 7) * 24 * 60 + FLOOR(start_hhmm / 100) * 60 + MOD(start_hhmm, 100)) < drange.start_offset_m + drange.duration_m
            AND (MOD((untis_lessons.week_day + drange.duration_w * 7 - drange.week_day)::integer, 7) * 24 * 60 + FLOOR(end_hhmm / 100) * 60 + MOD(end_hhmm, 100)) > drange.start_offset_m
            AND (
                untis_classes.name IN (SELECT unnest(drange.classes))
                OR
                untis_classes.legacy_name IN (SELECT unnest(drange.classes))
                OR
                untis_classes.name LIKE ANY (SELECT CONCAT(unnest(drange.class_groups), '%'))
            )
    ORDER BY untis_lessons.start_hhmm ASC;`
}
export default query;