SELECT 
    DISTINCT ON (view__events_classes.id, untis_lessons.semester_id, untis_lessons.id)
    view__events_classes.id as e_id,
    untis_lessons.semester_id as s_id,
    untis_lessons.*, 
    ARRAY_AGG(DISTINCT _teachers_to_lessons."B") AS teacher_ids,
    ARRAY_AGG(DISTINCT view__events_classes.klass_id) AS class_ids
FROM view__events_classes
    INNER JOIN _classes_to_lessons on view__events_classes.klass_id=_classes_to_lessons."A"
    INNER JOIN untis_lessons on _classes_to_lessons."B"=untis_lessons.id
    INNER JOIN _teachers_to_lessons on _teachers_to_lessons."A"=untis_lessons.id
WHERE 
    /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes                                                                 duration                                   */
    (MOD((untis_lessons.week_day - extract(DOW FROM view__events_classes.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.start_hhmm / 100) * 60 + MOD(untis_lessons.start_hhmm, 100)) < extract(HOUR FROM view__events_classes.start) * 60 + extract(MINUTE FROM view__events_classes.start) + CEIL(extract(EPOCH FROM AGE(view__events_classes.end, view__events_classes.start)) / 60)
    AND
    /*                                           DayOfWeek of the event                                                     hours                                        minutes                                            hours                                       minutes      */
    (MOD((untis_lessons.week_day - extract(DOW FROM view__events_classes.start) + 7)::INTEGER, 7) * 24 * 60 + FLOOR(untis_lessons.end_hhmm / 100) * 60 + MOD(untis_lessons.end_hhmm, 100)) > extract(HOUR FROM view__events_classes.start) * 60 + extract(MINUTE FROM view__events_classes.start)    
GROUP BY view__events_classes.id, untis_lessons.semester_id, untis_lessons.id;