import { PrismaClient } from "@prisma/client";
import prisma from "../prisma";
import { HTTP404Error } from "../utils/errors/Errors";
import { prepareTeacher } from "./untis.helpers";


function UntisTeachers(db: PrismaClient['untisTeacher']) {
    return Object.assign(db, {
        async all() {
            const models = await db.findMany({
                include: {
                    classes: false,
                    lessons: false,
                    user: { select: { id: true } }
                }
            });
            return models.map(prepareTeacher);
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
                    user: { select: { id: true } }
                }
            });
            
            if (!model) {
                throw new HTTP404Error('Teacher not found');
            }
            return prepareTeacher(model);
        },
    })
}

export default UntisTeachers(prisma.untisTeacher);