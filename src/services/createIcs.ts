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

const TEACHING_AFFECTED = {
    YES: '🔴',
    NO: '🟢',
    PARTIAL: '🟡'
}

interface i18nMessage {
    de: string;
    fr: string;
}

const i18n = {
    audience: {
        de: 'Zielgruppe',
        fr: 'Participant·e·s'
    },
    classes: {
        de: 'Klassen',
        fr: 'Classes'
    },
    description: {
        de: 'Beschreibung',
        fr: 'Description'
    },
    deletedAt: {
        de: 'Gelöscht am',
        fr: 'Supprimé le'
    },
    teachingAffected: {
        de: 'Unterricht betroffen?',
        fr: 'Enseignement concerné?'
    },
    YES: {
        de: 'Ja',
        fr: 'Oui'
    },
    NO: {
        de: 'Nein',
        fr: 'Non'
    },
    PARTIAL: {
        de: 'Teilweise',
        fr: 'Partiellement'
    }
} as const;

const translate = (key: keyof typeof i18n, language: 'de' | 'fr') => {
    return i18n[key][language];
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

export const createIcs = async (userId: string, jobId: string) => {
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
    const publicEvents = toCamelCase(publicEventsRaw);
    const fileName = user?.icsLocator || `${uuidv4()}.ics`;
    if (fileName && publicEvents.length > 0) {
        const eventsDe: EventAttributes[] = [];
        const eventsFr: EventAttributes[] = [];
        publicEvents.forEach(event => {
            eventsDe.push(prepareEvent(event, 'de'));
            eventsFr.push(prepareEvent(event, 'fr'));
        });
        const fileCreatedDe = new Promise<boolean>((resolve, reject) => {
            createEvents(eventsDe, (error, value) => {
                if (error) {
                    Logger.error(error);
                    return resolve(false);
                }            
                writeFileSync(`${ICAL_DIR}/de/${fileName}`, value, { encoding: 'utf-8', flag: 'w' })
                resolve(true);
            }
        )});
        const fileCreatedFr = new Promise<boolean>((resolve, reject) => {
            createEvents(eventsFr, (error, value) => {
                if (error) {
                    Logger.error(error);
                    return resolve(false);
                }            
                writeFileSync(`${ICAL_DIR}/fr/${fileName}`, value, { encoding: 'utf-8', flag: 'w' })
                resolve(true);
            }
        )});
        const filesCreated = await Promise.all([fileCreatedDe, fileCreatedFr]);
        if (filesCreated.every((res) => !!res)) {
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

export const createIcsForClasses = async () => {
    const today = new Date();
    const untisClasses = await prisma.untisClass.findMany({
        where: {
            year: {gte: today.getFullYear()}
        }
    });
    
    // const publicEventsRaw = await prisma.view_UsersAffectedByEvents.findMany({
    //     where: {
    //         userId: userId,
    //         parentId: null,
    //         state: EventState.PUBLISHED,
    //         OR: [
    //             {start: { lte: timeRange.to }},
    //             {end: { gte: timeRange.from }}
    //         ]
    //     }
    // });
}

export const createIcsForDepartments = async () => {
}
