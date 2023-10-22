import type { Event } from "@prisma/client";
import prisma from "../prisma";

export const checkEvent = async (eventId: string, semesterId: string) => {
    const result = await prisma.view_LessonsAffectedByEvents.findMany({
        where: {
            eventId: eventId,
            semesterId: semesterId
        }
    });
    return result;
}