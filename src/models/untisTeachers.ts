import { PrismaClient } from "@prisma/client";
import prisma from "../prisma";

function UntisTeachers(db: PrismaClient['untisTeacher']) {
    return Object.assign(db, {
        async all() {
            const models = await db.findMany({
                include: {
                    classes: false,
                    lessons: false,
                    user: false
                }
            });
            return models;
        },
        async findModel(id: string | number) {
            const model = await db.findUnique({
                where: {
                    id: Number.parseInt(`${id}`, 10)
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
            return model;
        },
    })
}

export default UntisTeachers(prisma.untisTeacher);