import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';
import { createEvents, DateArray, EventAttributes } from 'ics';
import { Event, EventAudience, EventState } from '@prisma/client';
import { writeFileSync } from 'fs';
import _ from 'lodash';
import { toCamelCase } from './helpers/rawQueryKeys';
import Logger from '../utils/logger';
import { ICAL_DIR } from '../app';
import { translate } from './helpers/i18n';

export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;
const MONTH_TO_MS = 31 * 24 * 60 * MINUTE_2_MS;

export const toDateArray = (date: Date): DateArray => {   
    return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

const TEACHING_AFFECTED = {
    YES: '🔴',
    NO: '🟢',
    PARTIAL: '🟡'
}



export const prepareEvent = (event: Event, lang: 'de' | 'fr'): EventAttributes => {
    const start = toDateArray(new Date(event.start));
    const end = toDateArray(new Date(event.end));
    const createdAt = toDateArray(new Date(event.createdAt));
    const updatedAt = toDateArray(new Date(event.updatedAt));
    const description: string[] = [];
    if (event.descriptionLong) {
        description.push(event.descriptionLong);
    }
    if (event.classes.length > 0 || event.classGroups.length > 0) {
        description.push(`${translate('classes', lang)}: ${[...event.classes, ...event.classGroups].join(', ')}`);
    }
    if (event.deletedAt) {
        description.push(`${translate('deletedAt', lang)}: ${event.deletedAt}`);
    }
    description.push(`${translate('teachingAffected', lang)} ${translate(event.teachingAffected, lang)} ${TEACHING_AFFECTED[event.teachingAffected]}`)
    description.push(`👉 ${process.env.EVENTS_APP_URL}/${lang === 'fr' ? 'fr/' : ''}event?id=${event.id}`);

    const title = event.deletedAt ? `❌ ${event.description} ${TEACHING_AFFECTED[event.teachingAffected]}` : `${event.description} ${TEACHING_AFFECTED[event.teachingAffected]}`;

    return {
        title: title,
        start: start,
        end: end,
        description: description.join('\n'),
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

const getTimeRange = () => {
    const today = new Date();
    const _1MonthAgo = new Date(today.getTime() - MONTH_TO_MS);
    const _15MonthForward = new Date(today.getTime() + 15 * MONTH_TO_MS);
    return {from: _1MonthAgo, to: _15MonthForward};
}

const exportIcs = async (events: Event[], filename: string) => {
    if (events.length === 0 || !filename) {
        return Promise.resolve(false);
    }
    const eventsDe: EventAttributes[] = [];
    const eventsFr: EventAttributes[] = [];
    events.forEach(event => {
        eventsDe.push(prepareEvent(event, 'de'));
        eventsFr.push(prepareEvent(event, 'fr'));
    });
    const fileCreatedDe = new Promise<boolean>((resolve, reject) => {
        createEvents(eventsDe, (error, value) => {
            if (error) {
                Logger.error(error);
                return resolve(false);
            }            
            writeFileSync(`${ICAL_DIR}/de/${filename}`, value, { encoding: 'utf-8', flag: 'w' })
            resolve(true);
        }
    )});
    const fileCreatedFr = new Promise<boolean>((resolve, reject) => {
        createEvents(eventsFr, (error, value) => {
            if (error) {
                Logger.error(error);
                return resolve(false);
            }            
            writeFileSync(`${ICAL_DIR}/fr/${filename}`, value, { encoding: 'utf-8', flag: 'w' })
            resolve(true);
        }
    )});
    const filesCreated = await Promise.all([fileCreatedDe, fileCreatedFr]);
    return filesCreated.every((res) => !!res);
}

export const createIcs = async (userId: string) => {
    const timeRange = getTimeRange();
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    
    const publicEventsRaw = await prisma.view_UsersAffectedByEvents.findMany({
        where: {
            userId: userId,
            parentId: null,
            state: EventState.PUBLISHED,
            OR: [
                {start: { lte: timeRange.to }},
                {end: { gte: timeRange.from }}
            ]
        }
    });
    // const publicEvents = toCamelCase(publicEventsRaw);
    const fileName = user?.icsLocator || `${uuidv4()}.ics`;
    const fileCreated = await exportIcs(publicEventsRaw, fileName);
    if (fileCreated) {
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                icsLocator: fileName
            }
        });
        return updated;
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
}

export const createIcsForClasses = async () => {
    const timeRange = getTimeRange();
    const today = new Date();
    const untisClasses = await prisma.untisClass.findMany({
        where: {
            year: {gte: today.getFullYear()}
        }
    });

    for (const untisClass of untisClasses) {
        const publicEvents = await prisma.view_EventsClasses.findMany({
            where: {
                classId: untisClass.id,
                parentId: null,
                state: EventState.PUBLISHED,
                audience: {in: [EventAudience.ALL, EventAudience.STUDENTS]},
                OR: [
                    {start: { lte: timeRange.to }},
                    {end: { gte: timeRange.from }}
                ]
            }
        });
        const fileCreated = await exportIcs(publicEvents, `${untisClass.name}.ics`);
        if (!fileCreated) {
            Logger.error(`Could not create ics file for class ${untisClass.name}`);
        }
    }    
}

export const createIcsForDepartments = async () => {
    const timeRange = getTimeRange();
    const departments = await prisma.department.findMany();

    for (const department of departments) {
        const publicEvents = await prisma.view_EventsClasses.findMany({
            where: {
                departmentId: department.id,
                parentId: null,
                state: EventState.PUBLISHED,
                OR: [
                    {start: { lte: timeRange.to }},
                    {end: { gte: timeRange.from }}
                ]
            }
        });
        const fileCreated = await exportIcs(publicEvents, `${department.name.replaceAll('/','_')}.ics`);
        if (!fileCreated) {
            Logger.error(`Could not create ics file for department ${department.name.replaceAll('/','_')}`);
        }
    }   
}
