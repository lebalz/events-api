import { Prisma, Event } from "@prisma/client";
import prisma from "../prisma";


const toArray = (raw: string[]) => {
    if (raw.length === 0) {
        return Prisma.sql`ARRAY[]::text[]`;
    }
    return Prisma.sql`ARRAY[${Prisma.join(raw)}]`;
}

// const toMatcherArray = (raw: string[]) => {
//     return toArray(raw.map((cg) => `${cg}%`));
// }

export const checkEvent = async (event: Event, userId?: string) => {
    const _classes = toArray(event.classes)
    const _groups = toArray(event.classGroups)
    const start = event.start;
    const end = event.end;
    const result = await prisma.$queryRaw<Event>(
        Prisma.sql`WITH drange AS (
            SELECT 
                ${event.id} AS id,
                extract(year FROM ${start}::TimeStamp) AS year_s,
                extract(year FROM ${end}::TimeStamp) AS year_e,
                extract(dow  FROM ${start}::TimeStamp) AS week_day,
                extract(hour FROM ${start}::TimeStamp) * 60 + extract(MINUTE  FROM  ${start}::TimeStamp) AS start_offset_m,
                CEIL(extract(EPOCH  FROM  age(${end}::TimeStamp,  ${start}::TimeStamp)) / 60) AS duration_m,
                CEIL(extract(EPOCH  FROM  age(${end}::TimeStamp,  ${start}::TimeStamp)) / 60 / 60 / 24 / 7) AS duration_w
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
                    untis_classes.name IN (SELECT unnest(${_classes}))
                    OR
                    untis_classes.legacy_name IN (SELECT unnest(${_classes}))
                    OR
                    untis_classes.name LIKE ANY (SELECT CONCAT(unnest(${_groups}), '%'))
                )
        ORDER BY untis_lessons.start_hhmm ASC;`
    );
    return result;
}