import prisma from '../prisma';
import { createEvents, DateArray, EventAttributes } from 'ics';
import { Event, EventAudience, EventState } from '@prisma/client';
import { promises as fsPromises } from 'fs';
import _ from 'lodash';
import Logger from '../utils/logger';
import { ICAL_DIR } from '../app';
import { translate } from './helpers/i18n';
import { ApiSubscription } from '../models/subscription.helpers';
import Subscription from '../models/subscription';
import { getDateTime, getDay } from './helpers/time';

export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;
const MONTH_TO_MS = 31 * 24 * 60 * MINUTE_2_MS;

const ICS_TIMEZONE_HEADER = `BEGIN:VTIMEZONE
TZID:Europe/Zurich
X-LIC-LOCATION:Europe/Zurich
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
END:VTIMEZONE` as const;

const withTimezoneHeader = (ics: string) => {
    /** insert before the first 'BEGIN:VEVENT' part */
    return ics.replace('BEGIN:VEVENT', `${ICS_TIMEZONE_HEADER}\nBEGIN:VEVENT`);
};

export const toDateArray = (date: Date): DateArray => {
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
    ];
};

const TEACHING_AFFECTED = {
    YES: '🔴',
    NO: '🟢',
    PARTIAL: '🟡'
};

export const prepareEvent = (
    event: Event,
    lang: 'de' | 'fr',
    legacyClassNames: { [key: string]: string }
): EventAttributes => {
    const start = toDateArray(new Date(event.start));
    const end = toDateArray(new Date(event.end));

    const allDayEvent = start[3] === 0 && start[4] === 0 && end[3] === 0 && end[4] === 0;
    if (allDayEvent) {
        start.splice(3, 2); // remove hours and minutes --> format as all day event
        end.splice(3, 2); // remove hours and minutes --> format as all day event
    }
    const createdAt = toDateArray(new Date(event.createdAt));
    const updatedAt = toDateArray(new Date(event.updatedAt));

    const description: string[] = [];
    if (event.descriptionLong) {
        description.push(event.descriptionLong);
    }
    const audience = [];
    if (event.classes.length > 0 || event.classGroups.length > 0) {
        audience.push(
            `${translate('classes', lang)}: ${[...event.classes.map((cls) => legacyClassNames[cls] || cls), ...event.classGroups].join(', ')}`
        );
    }
    if (event.deletedAt) {
        audience.push(`${translate('deletedAt', lang)}: ${event.deletedAt}`);
    }
    if (audience.length > 0) {
        description.push(...audience);
    }
    const teachingAffected = `${translate('teachingAffected', lang)} ${translate(event.teachingAffected, lang)}`;
    description.push(`${teachingAffected} ${TEACHING_AFFECTED[event.teachingAffected]}`);
    const baseUrl = `${process.env.EVENTS_APP_URL}/${lang === 'fr' ? 'fr/' : ''}`;
    description.push(`👉 ${translate('event', lang)} ${baseUrl}event?id=${event.id}`);
    description.push(`\n🔕 ${translate('unsubscribe', lang)}: ${baseUrl}unsubscribe/${event.id}`);

    const title = event.deletedAt
        ? `❌ ${event.description} ${TEACHING_AFFECTED[event.teachingAffected]}`
        : `${event.description} ${TEACHING_AFFECTED[event.teachingAffected]}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            background-color: #f7f9fc;
        }
        .event-container {
            max-width: 600px;
            margin: auto;
            background-color: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        .event-title {
            font-size: 24px;
            margin-bottom: 10px;
            color: #232a40;
        }
        .event-description {
            font-size: 16px;
            margin-bottom: 15px;
        }
        .event-status {
            font-size: 16px;
            font-weight: bold;
        }
        .status-teaching-affected {
            color: #ff4e42;
        }
        .status-partial {
            color: #ffa500;
        }
        .status-none {
            color: #28a745;
        }
        .event-date-time, .event-location, .event-audience {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        .event-links {
            margin-top: 20px;
        }
        .event-link a {
            color: #007bff;
            text-decoration: none;
        }
        .event-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="event-container">
        <div class="event-title">${title}</div>
        <div class="event-description">
            ${event.descriptionLong}
        </div>
        <div class="event-status status-teaching-affected">
            ${teachingAffected}
        </div>
        <div class="event-location">
            ${translate('location', lang)}: ${event.location}
        </div>
        <div class="event-date-time">
            ${translate('start', lang)}: ${getDay(event.start, lang)}. ${getDateTime(event.start)}<br>
            ${translate('end', lang)}: ${getDay(event.end, lang)}. ${getDateTime(event.end)}
        </div>
        <div class="event-audience">
            ${audience.join('<br>')}
        </div>
        <div class="event-links">
            <div class="event-link">
                <a href="${baseUrl}event?id=${event.id}" target="_blank">👉 ${translate('event', lang)} ${translate('viewOnline', lang)}</a>
            </div>
            <div class="event-link">
                <a href="${baseUrl}unsubscribe/${event.id}" target="_blank">🔕 ${translate('unsubscribe', lang)}</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return {
        title: title,
        start: start,
        end: end,
        url: `${baseUrl}event?id=${event.id}`,
        description: description.join('\n'),
        htmlContent: htmlContent,
        location: event.location,
        uid: event.id,
        startInputType: 'utc',
        startOutputType: 'local',
        endInputType: 'utc',
        endOutputType: 'local',
        categories: event.classes,
        lastModified: updatedAt,
        created: createdAt
    };
};

const getTimeRange = () => {
    const today = new Date();
    const _1MonthAgo = new Date(today.getTime() - MONTH_TO_MS);
    const _15MonthForward = new Date(today.getTime() + 15 * MONTH_TO_MS);
    return { from: _1MonthAgo, to: _15MonthForward };
};

const exportIcs = async (events: Event[], filename: string) => {
    if (events.length === 0 || !filename) {
        return Promise.resolve(false);
    }
    const legacyClassNamesRaw = await prisma.untisClass.findMany({
        where: {
            legacyName: { not: null }
        },
        select: {
            name: true,
            legacyName: true
        }
    });

    const classNameMap = legacyClassNamesRaw.reduce(
        (acc, curr) => {
            return { ...acc, [curr.name]: curr.legacyName! };
        },
        {} as { [key: string]: string }
    );

    const eventsDe: EventAttributes[] = [];
    const eventsFr: EventAttributes[] = [];
    events.forEach((event) => {
        eventsDe.push(prepareEvent(event, 'de', classNameMap));
        eventsFr.push(prepareEvent(event, 'fr', classNameMap));
    });
    const fileCreatedDe = new Promise<boolean>((resolve, reject) => {
        createEvents(eventsDe, async (error, value) => {
            /* istanbul ignore if */
            if (error) {
                Logger.error(error);
                return resolve(false);
            }
            const icsString = withTimezoneHeader(value);
            try {
                await fsPromises.writeFile(`${ICAL_DIR}/de/${filename}`, icsString, {
                    encoding: 'utf-8',
                    flag: 'w'
                });
                resolve(true);
            } catch (writeError) {
                Logger.error(writeError);
                resolve(false);
            }
        });
    });
    const fileCreatedFr = new Promise<boolean>((resolve, reject) => {
        createEvents(eventsFr, async (error, value) => {
            if (error) {
                Logger.error(error);
                return resolve(false);
            }
            const icsString = withTimezoneHeader(value);
            try {
                await fsPromises.writeFile(`${ICAL_DIR}/fr/${filename}`, icsString, {
                    encoding: 'utf-8',
                    flag: 'w'
                });
                resolve(true);
            } catch (writeError) {
                Logger.error(writeError);
                resolve(false);
            }
        });
    });
    const filesCreated = await Promise.all([fileCreatedDe, fileCreatedFr]);
    return filesCreated.every((res) => !!res);
};

export const createIcs = async (userId: string): Promise<ApiSubscription> => {
    const { model: subscription } = await Subscription.getOrCreateModel({ id: userId });
    return createIcsFromSubscription(subscription);
};

export const createIcsFromSubscription = async (subscription: ApiSubscription): Promise<ApiSubscription> => {
    const timeRange = getTimeRange();
    const toIgnore = new Set(subscription.ignoredEventIds);
    const userId = subscription.userId;

    const publicEventsRaw = await prisma.view_UsersAffectedByEvents.findMany({
        where: {
            userId: userId,
            parentId: null,
            state: EventState.PUBLISHED,
            id: { notIn: [...toIgnore] },
            OR: [{ start: { lte: timeRange.to } }, { end: { gte: timeRange.from } }]
        }
    });

    publicEventsRaw.forEach((event) => toIgnore.add(event.id));

    const subscribedDepartmentEvents = await prisma.view_EventsClasses.findMany({
        where: {
            departmentId: { in: subscription.departmentIds },
            parentId: null,
            state: EventState.PUBLISHED,
            id: { notIn: [...toIgnore] },
            OR: [{ start: { lte: timeRange.to } }, { end: { gte: timeRange.from } }]
        }
    });
    subscribedDepartmentEvents.forEach((event) => toIgnore.add(event.id));

    const subscribedClassEvents = await prisma.view_EventsClasses.findMany({
        where: {
            classId: { in: subscription.untisClassIds },
            parentId: null,
            state: EventState.PUBLISHED,
            id: { notIn: [...toIgnore] },
            OR: [{ start: { lte: timeRange.to } }, { end: { gte: timeRange.from } }]
        }
    });

    const allEvents = _.orderBy(
        [...publicEventsRaw, ...subscribedDepartmentEvents, ...subscribedClassEvents],
        ['start'],
        ['asc']
    );
    if (allEvents.length > 0) {
        await exportIcs(allEvents, subscription.icsLocator);
    } else {
        Logger.info(`No events to export for users subscription with userId ${userId}`);
        const deleteDe = fsPromises
            .stat(`${ICAL_DIR}/de/${subscription.icsLocator}`)
            .then((res) => {
                if (res.isFile()) {
                    return fsPromises.unlink(`${ICAL_DIR}/de/${subscription.icsLocator}`);
                }
                return Promise.resolve();
            })
            .catch((err) => {
                Logger.error(err.message);
            });
        const deleteFr = fsPromises
            .stat(`${ICAL_DIR}/fr/${subscription.icsLocator}`)
            .then((res) => {
                if (res.isFile()) {
                    return fsPromises.unlink(`${ICAL_DIR}/fr/${subscription.icsLocator}`);
                }
                return Promise.resolve();
            })
            .catch((err) => {
                Logger.error(err.message);
            });
        await Promise.all([deleteDe, deleteFr]);
    }
    return subscription;
};

export const createIcsForClasses = async () => {
    const timeRange = getTimeRange();
    const today = new Date();
    const untisClasses = await prisma.untisClass.findMany({
        where: {
            year: { gte: today.getFullYear() }
        }
    });
    for (const untisClass of untisClasses) {
        const publicEvents = await prisma.view_EventsClasses.findMany({
            where: {
                classId: untisClass.id,
                parentId: null,
                state: EventState.PUBLISHED,
                audience: { in: [EventAudience.ALL, EventAudience.STUDENTS] },
                OR: [{ start: { lte: timeRange.to } }, { end: { gte: timeRange.from } }]
            }
        });
        const fileCreated = await exportIcs(publicEvents, `${untisClass.name}.ics`);
        if (!fileCreated) {
            Logger.error(`Could not create ics file for class ${untisClass.name}`);
        }
    }
};

export const createIcsForDepartments = async () => {
    const timeRange = getTimeRange();
    const departments = await prisma.department.findMany();

    for (const department of departments) {
        const publicEvents = await prisma.view_EventsClasses.findMany({
            where: {
                departmentId: department.id,
                parentId: null,
                state: EventState.PUBLISHED,
                OR: [{ start: { lte: timeRange.to } }, { end: { gte: timeRange.from } }]
            }
        });
        const fileCreated = await exportIcs(publicEvents, `${department.name.replaceAll('/', '_')}.ics`);
        if (!fileCreated) {
            Logger.error(`Could not create ics file for department ${department.name.replaceAll('/', '_')}`);
        }
    }
};
