import { EventState, type Event, type Prisma } from "@prisma/client";
import prisma from "../prisma";
import { v4 as uuidv4 } from 'uuid';
import { ApiEvent } from "../models/event.helpers";
import Logger from "../utils/logger";
import { affectedLessons as checkAffectedLessons, affectedTeachers as checkAffectedTeachers } from "./eventChecker";


const withTmpEvent = async <T>(userId: string, data: Partial<ApiEvent>, callback: (event: Event) => Promise<T[]>) => {
    const tempId = uuidv4();
    try {
        const { departmentIds } = data;
        ['departmentIds', 'publishedVersionIds', 'authorId', 'jobId', 'parentId'].forEach((key) => {
            delete (data as any)[key];
        });


        const tempEvent = await prisma.event.create({
            data: {
                ...(data as Prisma.EventCreateInput),
                author: { connect: { id: userId }},
                state: EventState.DRAFT,
                departments: (departmentIds || []).length > 0 ? { connect: departmentIds!.map(id => ({ id }))} : undefined,
                groups: undefined,               
                id: tempId,
            }
        });
        return await callback(tempEvent);
    } finally {
        // This block executes whether an exception is thrown or not
        try {
            await prisma.event.delete({
                where: {
                    id: tempId
                }
            });
        } catch (error) {
            Logger.error('Error deleting temporary event', tempId, error);
        }
    }
}

export const affectedTeachers = async (userId: string, event: ApiEvent, semesterId: string) => {
    return withTmpEvent(userId, event, async (tempEvent) => {
        return await checkAffectedTeachers(tempEvent.id, semesterId);
    });
}

export const affectedLessons = async (userId: string, event: ApiEvent, semesterId: string) => {
    return withTmpEvent(userId, event, async (tempEvent) => {
        return await checkAffectedLessons(tempEvent.id, semesterId);
    });
}