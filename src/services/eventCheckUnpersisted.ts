import type { Event } from "@prisma/client";
import prisma from "../prisma";
import { v4 as uuidv4 } from 'uuid';

export const checkEvent = async (event: Event, semesterId: string) => {
    const tempId = uuidv4();
    try {
        const tempEvent = await prisma.event.create({
            data: {
                ...event,
                id: tempId,
            }
        });
        if (!tempEvent) {
            throw new Error('Event could not be created');
        }
        const result = await prisma.view_LessonsAffectedByEvents.findMany({
            where: {
                eventId: tempEvent.id,
                semesterId: semesterId
            }
        });

        return result;
    } finally {
        try {
            await prisma.event.delete({
                where: {
                    id: tempId
                }
            });
        } catch (error) {
            // ignore
        }
    }
}