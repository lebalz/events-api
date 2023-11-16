CREATE VIEW view__events_classes AS
    SELECT events.*, untis_classes.id AS klass_id, untis_classes.name AS klass_name, departments.id AS department_id
        FROM events 
            JOIN _events_to_departments e2d ON e2d."B"=events.id
            JOIN departments ON departments.id=e2d."A"
            JOIN untis_classes ON untis_classes.department_id=departments.id

    UNION

    SELECT events.*, untis_classes.id AS klass_id, untis_classes.name AS klass_name, untis_classes.department_id AS department_id
        FROM events
            JOIN untis_classes ON untis_classes.name = ANY(events.classes)

    UNION

    SELECT events.*, untis_classes.id AS klass_id, untis_classes.name AS klass_name, untis_classes.department_id AS department_id
        FROM events
            JOIN untis_classes ON untis_classes.name SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events.class_groups), '|','--'), ')%')
;