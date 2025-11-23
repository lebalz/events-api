-- view__lessons_affected_by_events_unfiltered
SELECT
    view__events_classes.id as e_id,
    view__events_classes.start as e_start,
    view__events_classes.end as e_end,
    untis_lessons.id as lesson_id, 
    _teachers_to_lessons."B" AS teacher_id,
    view__events_classes.klass_id AS klass_id
FROM view__events_classes
    INNER JOIN _classes_to_lessons on view__events_classes.klass_id=_classes_to_lessons."A"
    INNER JOIN untis_lessons on _classes_to_lessons."B"=untis_lessons.id
    INNER JOIN _teachers_to_lessons on _teachers_to_lessons."A"=untis_lessons.id

UNION

SELECT
    events.id as e_id,
    events.start as e_start,
    events.end as e_end,
    untis_lessons.id as lesson_id, 
    _teachers_to_lessons."B" AS teacher_id,
    _classes_to_lessons."A" AS klass_id
FROM events 
    JOIN _events_to_users e2u ON e2u."A"=events.id
    JOIN users ON users.id=e2u."B"
    JOIN _teachers_to_lessons ON _teachers_to_lessons."B"=users.untis_id
    JOIN untis_lessons ON _teachers_to_lessons."A"=untis_lessons.id
    JOIN _classes_to_lessons ON _classes_to_lessons."B"=_teachers_to_lessons."A"
;