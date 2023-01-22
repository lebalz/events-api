import { UntisTeacher } from "@prisma/client";
import prisma from "./prisma";

const teacherCache = new Map<string, UntisTeacher>();

export const reload = () => {
    teacherCache.clear();
}
export const findTeacher = async (id: string, firstName: string, lastName: string) => {
    if (teacherCache.has(id)) {
        return teacherCache.get(id);
    }
    const teacher = await prisma.untisTeacher.findFirst(
        {where: {
            AND: [
                {longName: {
                    contains: firstName,
                    mode: 'insensitive'
                }},
                {longName: {
                    contains: lastName,
                    mode: 'insensitive'
                }}
            ]
        }}
    )
    if (teacher) {
        teacherCache.set(id, teacher);
    }
    return teacher || undefined;
}

