import { RequestHandler } from "express";
import prisma from "../prisma";
import { Prisma } from "@prisma/client";

export const teachers: RequestHandler = async (req, res, next) => {
    try {
        const tchrs = await prisma.untisTeacher.findMany({
            include: {
                classes: false,
                lessons: false,
                user: false
            }
        });
        res.json(tchrs);
    } catch (error) {
        next(error);
    }
}

export const teacher: RequestHandler = async (req, res, next) => {
    try {
        const tchr = await prisma.untisTeacher.findUnique({
            where: {
                id: Number.parseInt(req.params.id, 10)
             },
            include: {
                lessons: {
                    include: {
                        teachers: {
                            select: {
                                id: true,
                            }
                        },
                        classes: {
                            select: {
                                id: true,
                            }
                        }
                    }
                },
            }
        });
        res.json(tchr);
    } catch (error) {
        next(error);
    }
}

export const classes: RequestHandler = async (req, res, next) => {
    try {
        const clsx = await prisma.untisClass.findMany({
            include: {
                teachers: {
                    select: {
                        id: true,
                    }
                },
                lessons: {
                    select: {
                        id: true,
                    }
                }
            }
        });
        res.json(clsx);
    } catch (error) {
        next(error);
    }
}

export const subjects: RequestHandler = async (req, res, next) => {
    try {
        const result = await prisma.$queryRaw<{name: string, description: string, departmentNames: string}[]>(
            Prisma.sql`SELECT l.subject AS name, l.description AS description, STRING_AGG(DISTINCT SPLIT_PART(d.name, '/', 1), '/') AS "departmentNames"
                        FROM untis_lessons AS l 
                        INNER JOIN _classes_to_lessons AS cl ON l.id=cl."B"
                        INNER JOIN untis_classes AS c ON cl."A"=c.id
                        INNER JOIN departments AS d ON d.id=c.department_id
                        GROUP BY l.subject, l.description;`
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
}