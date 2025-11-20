import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../prisma';

export interface UntisSubject {
    name: string;
    description: string;
    departmentIds: string[];
}

export interface UntisTeacherSubject {
    userId: string;
    shortName: string;
    lang: string;
    semesterId: string;
    subjects: { name: string, description: string }[];
}

function UntisLessons(db: PrismaClient['untisLesson']) {
    return Object.assign(db, {
        async subjects() {
            const result = await prisma.$queryRaw<UntisSubject[]>(
                Prisma.sql`
                    SELECT l.subject AS name, l.description AS description, ARRAY_AGG(DISTINCT d.id) AS "departmentIds"
                    FROM untis_lessons AS l 
                        INNER JOIN _classes_to_lessons AS cl ON l.id=cl."B"
                        INNER JOIN untis_classes AS c ON cl."A"=c.id
                        INNER JOIN departments AS d ON d.id=c.department_id
                    GROUP BY l.subject, l.description;
                `
            );
            return result;
        },
        async teachersSubjects(semesterId: string) {
            const result = await prisma.$queryRaw<UntisTeacherSubject[]>(
                Prisma.sql`SELECT
                                users.id as "userId",
                                untis_teachers.name AS "shortName",
                                case WHEN untis_teachers.name=UPPER(untis_teachers.name) THEN 'fr' ELSE 'de' END AS "lang",
                                l.semester_id AS "semesterId",
                                json_agg(DISTINCT jsonb_build_object('name', l.subject, 'description', l.description)) AS "subjects"  
                            FROM untis_lessons AS l 
                                INNER JOIN _teachers_to_lessons AS tl ON l.id=tl."A"
                                INNER JOIN untis_teachers ON tl."B"=untis_teachers.id
                                INNER JOIN users ON users.untis_id=tl."B"
                            WHERE l.semester_id=${semesterId}::uuid
                            GROUP BY users.id, untis_teachers.id, l.semester_id;
                `
            );
            return result;
        }
    });
}

export default UntisLessons(prisma.untisLesson);
