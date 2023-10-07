import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../prisma";

export interface UntisSubject {
    name: string;
    description: string;
    departmentIds: string[];
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
        }
    })
}

export default UntisLessons(prisma.untisLesson);