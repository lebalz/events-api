-- view__lessons_affected_by_events
SELECT
    DISTINCT ON (e_id, ul.semester_id, ul.id)
    e_id,
    ul.*,
    ARRAY_AGG(DISTINCT lv.teacher_id) AS teacher_ids,
    ARRAY_AGG(DISTINCT lv.klass_id) AS class_ids
FROM view__lessons_affected_by_events_unfiltered as lv
    JOIN untis_lessons ul ON ul.id=lv.lesson_id
WHERE
    /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes                                                                 duration                                   */
    (MOD((ul.week_day - extract(DOW FROM lv.e_start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(ul.start_hhmm / 100) * 60 + MOD(ul.start_hhmm, 100)) < extract(HOUR FROM lv.e_start) * 60 + extract(MINUTE FROM lv.e_start) + CEIL(extract(EPOCH FROM AGE(lv.e_end, lv.e_start)) / 60)
    AND
    /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes      */
    (MOD((ul.week_day - extract(DOW FROM lv.e_start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(ul.end_hhmm / 100) * 60 + MOD(ul.end_hhmm, 100)) > extract(HOUR FROM lv.e_start) * 60 + extract(MINUTE FROM lv.e_start)
GROUP BY e_id, semester_id, id
;
