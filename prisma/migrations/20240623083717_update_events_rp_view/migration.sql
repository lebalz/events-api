DROP VIEW IF EXISTS view__events_registration_periods;
CREATE OR REPLACE VIEW view__events_registration_periods AS
    SELECT
        DISTINCT ON (events2departments.id, reg_period.id)
        events2departments.id AS e_id,
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