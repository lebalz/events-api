import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';
import { createEvents, DateArray, EventAttributes } from 'ics';
import { start } from 'repl';
import { writeFileSync } from 'fs';
import { EventState, Prisma } from '@prisma/client';
import query from './assets/query.eventsAffectingUser';
import { Event } from '@prisma/client';

export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;

export const toDateArray = (date: Date): DateArray => {   
    return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

export default async function createIcs(userId: string, jobId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    const publicEvents = await prisma.$queryRaw<Event[]>(query(userId, {monthForward: 15, monthBackward: 1}));
    const fileName = user?.icsLocator || `${uuidv4()}.ics`;
    if (fileName && publicEvents.length > 0) {
        const events: EventAttributes[] = [];
        publicEvents.forEach(event => {
            const start = toDateArray(new Date(event.start));
            const end = toDateArray(new Date(event.end));
            const createdAt = toDateArray(new Date(event.createdAt));
            const updatedAt = toDateArray(new Date(event.updatedAt));
            const descriptionLong = `${event.descriptionLong}

            ${event.classes.length > 0 ? 'Klassen: ' + event.classes.join(', ') : ''}
            ${event.deletedAt ? 'Gelöscht am: ' + event.deletedAt : ''}
            ${event.location ? 'Ort: ' + event.location : ''}

            👉 ${process.env.EVENTS_APP_URL}/event?id=${event.id}`
            events.push({
                title: event.description,
                start: start,
                end: end,
                description: descriptionLong,
                location: event.location,
                uid: event.id,
                startInputType: 'utc',
                startOutputType: 'local',
                endInputType: 'utc',
                endOutputType: 'local',
                categories: event.classes,
                lastModified: updatedAt,
                created: createdAt 
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
    }
    return user;
}