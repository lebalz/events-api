SELECT distinct on (untis_classes.id, untis_teachers.id, untis_lessons.semester_id)
    users.id as u_id,
    untis_teachers.id as t_id, 
    untis_teachers.name as t_name, 
    untis_classes.id as c_id, 
    untis_classes.name as c_name, 
    untis_lessons.semester_id as s_id
FROM untis_teachers
    join _teachers_to_lessons ON untis_teachers.id=_teachers_to_lessons."B"
    join untis_lessons ON _teachers_to_lessons."A"=untis_lessons.id
    join _classes_to_lessons ON untis_lessons.id=_classes_to_lessons."B"
    join untis_classes ON _classes_to_lessons."A"=untis_classes.id
    left join users on untis_teachers.id=users.untis_id
WHERE subject in ('KS', 'MC');