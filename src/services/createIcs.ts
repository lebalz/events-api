import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';
import { createEvents, EventAttributes } from 'ics';
import { start } from 'repl';
import { writeFileSync } from 'fs';

export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;

export const toLocalDate = (date: Date) => {   
    return date;
}

export default async function createIcs(userId: string, jobId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            events: true
        }
    });
    const fileName = user?.icsLocator || `${uuidv4()}.ics`;
    const events: EventAttributes[] = [];
    user?.events.forEach(event => {
        const start = toLocalDate(new Date(event.start));
        const end = toLocalDate(new Date(event.end));
        const createdAt = toLocalDate(new Date(event.createdAt));
        const updatedAt = toLocalDate(new Date(event.updatedAt));
        events.push({
            title: event.description,
            start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
            end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
            description: event.descriptionLong,
            location: event.location,
            categories: event.classes,
            lastModified: [updatedAt.getFullYear(), updatedAt.getMonth() + 1, updatedAt.getDate(), updatedAt.getHours(), updatedAt.getMinutes()],
            created: [createdAt.getFullYear(), createdAt.getMonth() + 1, createdAt.getDate(), createdAt.getHours(), createdAt.getMinutes()]            
        });
    });
    const fileCreated: boolean = await new Promise((resolve, reject) => {
        createEvents(events, (error, value) => {
            if (error) {
                return resolve(false);
            }            
            writeFileSync(`${__dirname}/../../ical/${fileName}`, value, { encoding: 'utf8', flag: 'w' })
            resolve(true);
        }
    )});
    if (fileCreated) {
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                icsLocator: fileName
            }
        });
        return updated;
    }
    return user;
}