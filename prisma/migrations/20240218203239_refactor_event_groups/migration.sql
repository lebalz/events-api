/*
  Warnings:

  - You are about to drop the column `user_group_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the `user_event_groups` table. If the table is not empty, all the data it contains will be lost.

*/
DROP VIEW IF EXISTS view__lessons_affected_by_events;
DROP VIEW IF EXISTS view__users_affected_by_events;
DROP VIEW IF EXISTS view__affected_by_events;
DROP VIEW IF EXISTS view__users_teaching_agg;
DROP VIEW IF EXISTS view__users_teaching;
DROP VIEW IF EXISTS view__events_classes;
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_user_group_id_fkey";

-- DropForeignKey
ALTER TABLE "user_event_groups" DROP CONSTRAINT "user_event_groups_user_id_fkey";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "user_group_id";

-- DropTable
DROP TABLE "user_event_groups";

-- CreateTable
CREATE TABLE "event_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_events_to_event_groups" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_users_to_event_groups" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_events_to_event_groups_AB_unique" ON "_events_to_event_groups"("A", "B");

-- CreateIndex
CREATE INDEX "_events_to_event_groups_B_index" ON "_events_to_event_groups"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_users_to_event_groups_AB_unique" ON "_users_to_event_groups"("A", "B");

-- CreateIndex
CREATE INDEX "_users_to_event_groups_B_index" ON "_users_to_event_groups"("B");

-- AddForeignKey
ALTER TABLE "_events_to_event_groups" ADD CONSTRAINT "_events_to_event_groups_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_events_to_event_groups" ADD CONSTRAINT "_events_to_event_groups_B_fkey" FOREIGN KEY ("B") REFERENCES "event_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_users_to_event_groups" ADD CONSTRAINT "_users_to_event_groups_A_fkey" FOREIGN KEY ("A") REFERENCES "event_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_users_to_event_groups" ADD CONSTRAINT "_users_to_event_groups_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE OR REPLACE VIEW view__users_teaching AS
    SELECT
        users.id AS u_id,
        users.email AS u_email, 
        classes.id AS c_id,
        classes.name AS c_name,
        classes.legacy_name AS c_name_legacy,
        lessons.id AS l_id,
        lessons.subject AS l_subject,
        lessons.start_hhmm AS l_start_hhmm,
        lessons.end_hhmm AS l_end_hhmm,
        lessons.week_day AS l_week_day,
        lessons.semester_id as l_semester_id,
        departments.id AS d_id,
        departments.letter AS d_letter,
        COALESCE(   CASE WHEN UPPER(untis_teachers.name) = untis_teachers.name -- Grossbuchstaben --> franz. gymer
                    THEN 
                        CASE WHEN LOWER(d_1.letter) = d_1.letter -- Kleinbuchstaben --> franz. gymer
                        THEN d_1.id
                        ELSE d_2.id
                        END
                    ELSE
                        CASE WHEN UPPER(d_1.letter) = d_1.letter -- Grossbuchstaben --> deutsch. gymer
                        THEN d_1.id
                        ELSE d_2.id
                        END
                    END,
                    CASE WHEN lessons.subject LIKE 'EF%' or lessons.subject LIKE 'OC%'
                    THEN
                        CASE WHEN LOWER(departments.letter) = departments.letter -- Kleinbuchstaben --> franz. gymer
                        THEN 
                            CASE WHEN UPPER(untis_teachers.name) = untis_teachers.name -- Grossbuchstaben --> franz. gymer
                            THEN departments.id
                            ELSE NULL
                            END
                        ELSE
                            CASE WHEN LOWER(untis_teachers.name) = untis_teachers.name -- Grossbuchstaben --> deutsch. gymer
                            THEN departments.id
                            ELSE NULL
                            END
                        END
                    ELSE departments.id
                    END
                ) AS d_school_id,
        departments.name AS d_name,
        untis_teachers.id AS untis_teacher_id
    FROM users
        INNER JOIN _teachers_to_classes AS t2c ON users.untis_id=t2c."B"
        INNER JOIN untis_classes AS classes ON t2c."A"=classes.id
        INNER JOIN _classes_to_lessons AS c2l ON classes.id=c2l."A"
        INNER JOIN _teachers_to_lessons AS t2l ON users.untis_id=t2l."B"
        INNER JOIN untis_lessons AS lessons ON c2l."B"=lessons.id AND t2l."A"=lessons.id
        INNER JOIN departments ON classes.department_id=departments.id
        INNER JOIN untis_teachers ON users.untis_id=untis_teachers.id
        LEFT JOIN departments AS d_1 ON d_1.id=departments.department1_id
        LEFT JOIN departments AS d_2 ON d_2.id=departments.department2_id;

CREATE OR REPLACE VIEW view__users_teaching_agg AS
    SELECT
        u_id,
        l_semester_id,
        array_agg(DISTINCT c_id) AS class_ids,
        array_agg(DISTINCT c_name) AS class_names,
        array_remove(array_agg(DISTINCT c_name_legacy), NULL) AS legacy_class_names,
        array_remove(array_agg(DISTINCT (CASE WHEN ((l_subject LIKE 'EF%' AND LOWER(d_letter)=d_letter) OR (l_subject LIKE 'OC%'  AND UPPER(d_letter)=d_letter)) THEN NULL ELSE c_name END)), NULL) AS class_names_monolingue,
        array_agg(DISTINCT l_subject) AS subjects,
        array_agg(DISTINCT d_id) AS department_ids,
        array_remove(array_agg(DISTINCT d_school_id), NULL) AS department_school_ids,
        array_agg(DISTINCT d_name) AS department_names,
        max(CASE WHEN l_subject='KS' OR l_subject='MC' THEN c_name ELSE NULL END) AS klp, -- max returns the maximal/first non null value
        max(CASE WHEN l_subject='KS' OR l_subject='MC' THEN d_id::text ELSE NULL END)::uuid AS klp_department_id
    FROM view__users_teaching
    GROUP BY
        u_id, l_semester_id;

CREATE OR REPLACE VIEW view__affected_by_events AS
    SELECT
        view__users_teaching.u_id AS u_id,
        view__users_teaching.untis_teacher_id AS untis_teacher_id,
        view__events.e_id AS e_id,
        view__events.s_id AS s_id,
        view__users_teaching.c_id AS c_id,
        view__users_teaching.l_id AS l_id
    FROM view__events
        INNER JOIN view__users_teaching_agg ON view__events.s_id = view__users_teaching_agg.l_semester_id
        INNER JOIN view__users_teaching ON view__events.s_id = view__users_teaching.l_semester_id
    WHERE
        view__users_teaching.u_id=view__users_teaching_agg.u_id
    AND (
            /* Info note: {NULL} && {NULL} evaluates to false */
            (   CASE WHEN view__events.affects_department2
                THEN view__events.department_ids && view__users_teaching_agg.department_ids
                ELSE view__events.department_school_ids && view__users_teaching_agg.department_school_ids
                END 
                    AND (view__events.audience = 'LP' OR view__events.audience = 'ALL'))
        OR (
            (
                    /* overlapping exact class names */
                    CASE WHEN view__events.affects_department2
                    THEN view__events.classes && view__users_teaching_agg.class_names
                    ELSE view__events.classes && view__users_teaching_agg.class_names_monolingue
                    END
                OR
                    /* class name in class_group */
                    /* array_cat: concat's multiple arrays; array_to_string(<array>, <join-value>, <when-null-value>) 
                                --> class_groups: [] --> %(--)%
                                --> class_groups: [24G] --> %(--|24G)%
                                --> class_groups: [24G, 26m] --> %(--|24G|26m)%
                    */
                    CASE WHEN view__events.affects_department2
                    THEN array_to_string(view__users_teaching_agg.class_names, ':::') SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], view__events.class_groups), '|','--'), ')%')
                    ELSE array_to_string(view__users_teaching_agg.class_names_monolingue, ':::') SIMILAR TO CONCAT('%(', array_to_string(array_cat(ARRAY[NULL], view__events.class_groups), '|','--'), ')%')
                    END
                OR
                    /** overlapping departments 
                     *  Info note: {NULL} && {NULL} evaluates to false 
                     */
                    (   CASE WHEN (view__events.affects_department2 OR view__events.audience = 'KLP' OR view__events.audience = 'STUDENTS')
                        THEN view__events.department_ids && view__users_teaching_agg.department_ids
                        ELSE view__events.department_school_ids && view__users_teaching_agg.department_school_ids
                        END
                            AND view__events.audience != 'KLP')
                OR
                    (view__users_teaching_agg.klp_department_id = ANY(view__events.department_ids) AND view__events.audience = 'KLP')
            )
            AND (
                    /* & klp */
                    (view__events.audience = 'KLP' AND view__users_teaching_agg.klp IS NOT NULL AND (
                            /* overlapping departments */
                            (view__users_teaching_agg.klp_department_id = ANY(view__events.department_ids))
                        OR
                            /* overlapping exact class names */
                            (view__users_teaching_agg.klp = ANY(view__events.classes))
                        OR
                            /* overlapping class groups */
                            (view__users_teaching_agg.klp SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], view__events.class_groups), '|','--'), ')%'))
                    ))
                OR 
                    /* & only teachers */
                    (view__events.audience = 'LP')
                OR  
                    /* & every teacher of the class and the students of the class */
                    (view__events.audience='ALL')
                OR
                    /* & only overlapping lessons of class */
                    (
                        (view__events.audience='STUDENTS')
                    AND 
                        (
                            (
                                (
                                    view__users_teaching.c_name in (select unnest(view__events.classes))
                                    OR
                                    view__users_teaching.c_name LIKE ANY (SELECT CONCAT(unnest(view__events.class_groups), '%'))
                                    OR
                                    view__users_teaching.d_id = ANY(view__events.department_ids)
                                )
                                AND (MOD((view__users_teaching.l_week_day - view__events.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(view__users_teaching.l_start_hhmm / 100) * 60 + MOD(view__users_teaching.l_start_hhmm, 100)) < view__events.start_offset_m + view__events.duration_m
                                AND (MOD((view__users_teaching.l_week_day - view__events.start_week_day + 7)::INTEGER, 7) * 24 * 60 + FLOOR(view__users_teaching.l_end_hhmm / 100) * 60 + MOD(view__users_teaching.l_end_hhmm, 100)) > view__events.start_offset_m
                            )
                        OR 
                            (
                                view__users_teaching_agg.klp IS NOT NULL
                            AND 
                                (
                                    /* overlapping departments */
                                    (view__users_teaching_agg.klp_department_id = ANY(view__events.department_ids))
                                OR
                                    /* overlapping exact class names */
                                    (view__users_teaching_agg.klp = ANY(view__events.classes))
                                OR
                                    /* overlapping class groups */
                                    (view__users_teaching_agg.klp SIMILAR TO CONCAT('(', array_to_string(array_cat(ARRAY[NULL], view__events.class_groups), '|','--'), ')%'))
                                )
                            )
                        )
                    )
            )
        )
    );


CREATE OR REPLACE VIEW view__users_affected_by_events AS
    SELECT DISTINCT ON (u_id, s_id, e_id) u_id, s_id, events.*
        FROM view__affected_by_events
            INNER JOIN events ON view__affected_by_events.e_id = events.id;


CREATE OR REPLACE VIEW view__lessons_affected_by_events AS
    SELECT DISTINCT ON (e_id, s_id, untis_lessons.id)
        e_id, s_id, untis_lessons.*, 
        ARRAY_AGG(DISTINCT untis_teacher_id) AS teacher_ids,
        ARRAY_AGG(DISTINCT c_id) AS class_ids
    FROM view__affected_by_events
        INNER JOIN untis_lessons ON view__affected_by_events.l_id = untis_lessons.id
    GROUP BY e_id, s_id, untis_lessons.id;

CREATE OR REPLACE VIEW view__events_classes AS
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