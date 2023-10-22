import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';
import { createEvents, DateArray, EventAttributes } from 'ics';
import { Event, EventState } from '@prisma/client';
import { writeFileSync } from 'fs';
import _ from 'lodash';
import { toCamelCase } from './helpers/rawQueryKeys';
import Logger from '../utils/logger';
import { ICAL_DIR } from '../app';

export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;
const MONTH_TO_MS = 31 * 24 * 60 * MINUTE_2_MS;

export const toDateArray = (date: Date): DateArray => {   
    return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

export const prepareEvent = (event: Event): EventAttributes => {
    const start = toDateArray(new Date(event.start));
    const end = toDateArray(new Date(event.end));
    const createdAt = toDateArray(new Date(event.createdAt));
    const updatedAt = toDateArray(new Date(event.updatedAt));
    const descriptionLong = `${event.descriptionLong || ''}

    ${event.classes.length > 0 ? 'Klassen: ' + event.classes.join(', ') : ''}
    ${event.deletedAt ? 'Gelöscht am: ' + event.deletedAt : ''}
    ${event.location ? 'Ort: ' + event.location : ''}

    👉 ${process.env.EVENTS_APP_URL}/event?id=${event.id}`;

    return {
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
    }
}

export default async function createIcs(userId: string, jobId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    
    const today = new Date();
    const _1MonthAgo = new Date(today.getTime() - MONTH_TO_MS);
    const _15MonthForward = new Date(today.getTime() + 15 * MONTH_TO_MS);
    const publicEventsRaw = await prisma.view_UsersAffectedByEvents.findMany({
        where: {
            userId: userId,
            parentId: null,
            state: EventState.PUBLISHED,
            OR: [
                {start: { lte: _15MonthForward }},
                {end: { gte: _1MonthAgo }}
            ]
        }
    });
    const publicEvents = toCamelCase(publicEventsRaw);
    const fileName = user?.icsLocator || `${uuidv4()}.ics`;
    if (fileName && publicEvents.length > 0) {
        const events: EventAttributes[] = [];
        publicEvents.forEach(event => {
            events.push(prepareEvent(event));
        });
        const fileCreated: boolean = await new Promise((resolve, reject) => {
            createEvents(events, (error, value) => {
                if (error) {
                    Logger.error(error);
                    return resolve(false);
                }            
                writeFileSync(`${ICAL_DIR}/${fileName}`, value, { encoding: 'utf-8', flag: 'w' })
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
    } else {
        // no events found - delete the ics file, since empty ics files are not valid
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                icsLocator: null
            }
        });
        return updated;
    }
    throw new Error('Could not create ics file');
}