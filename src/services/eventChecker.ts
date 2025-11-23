import prisma from '../prisma';

export const affectedLessons = async (eventId: string, semesterId: string) => {
    const result = await prisma.view_LessonsAffectedByEvents.findMany({
        where: {
            eventId: eventId,
            semesterId: semesterId
        }
    });
    return result;
};

export const affectedTeachers = async (eventId: string, semesterId: string) => {
    const result = await prisma.view_UsersAffectedByEvents.findMany({
        where: {
            id: eventId,
            semesterId: semesterId
        },
        select: {
            userId: true
        }
    });
    return result.map(({ userId }) => userId);
};
