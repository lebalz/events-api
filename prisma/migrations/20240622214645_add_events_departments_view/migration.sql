CREATE OR REPLACE VIEW view__events_departments AS
    SELECT
        events.*,
        e2d."A" AS d_id
    FROM events
        JOIN _events_to_departments e2d ON e2d."B"=events.id
    
    UNION DISTINCT

    SELECT
        events.*,
        untis_classes.department_id AS d_id
    FROM events
        JOIN untis_classes ON untis_classes.name = ANY(events.classes)
    
    UNION DISTINCT

    SELECT
        events.*,
        untis_classes.department_id AS d_id
    FROM events
        JOIN untis_classes ON untis_classes.name SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], events.class_groups), '|','--'), ')%')
;


CREATE OR REPLACE VIEW view__events_registration_periods AS
    SELECT
        events2departments.id AS e_id,
        events2departments.d_id AS d_id,
        reg_period.id AS rp_id,
        reg_period.name AS rp_name,
        reg_period.is_open AS rp_is_open,
        reg_period.start AS rp_start,
        reg_period.end AS rp_end,
        reg_period.event_range_start AS rp_event_range_start,
        reg_period.event_range_end AS rp_event_range_end
    FROM
        view__events_departments AS events2departments
        JOIN _registration_periods_to_departments AS rp2d ON rp2d."A"=events2departments.d_id
        JOIN registration_periods AS reg_period ON reg_period.id=rp2d."B"
    WHERE
        events2departments.start >= reg_period.event_range_start
        AND events2departments.start <= reg_period.event_range_end;