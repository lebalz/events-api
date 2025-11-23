SELECT * FROM view__affected_by_events_unfiltered
WHERE
    affects_department OR affects_classname OR affects_classgroup OR affects_user
;