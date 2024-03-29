import { Event } from "@prisma/client";
import { ApiEvent } from "../../../models/event.helpers";
import _ from "lodash";
import { translate } from "../../helpers/i18n";
import { getDateTime } from "../../helpers/time";

const EXCLUDED_PROPS = new Set<keyof ApiEvent>([
    'id',
    'createdAt',
    'authorId',
    'jobId',
    'publishedVersionIds',
    'affectsDepartment2',
    'parentId',
    'departmentIds',
    'cloned'
]);

const getValue = (event: ApiEvent, key: keyof Event, locale: 'de' | 'fr') => {
    switch (key) {
        case 'start':
        case 'deletedAt':
        case 'end':
        case 'updatedAt':
            return getDateTime(event[key] as Date | undefined);
        case 'state':
        case 'teachingAffected':
        case 'audience':
            return translate(event[key] as any, locale);
        default:
            return event[key];
    }
}

export const getChangedProps = (current: ApiEvent, updated: ApiEvent, locale: 'de' |'fr', excludedProps: (keyof ApiEvent)[] = []) => {
    const excluded = new Set([...EXCLUDED_PROPS, ...excludedProps]);
    const changedProps: {name: string, old: any, new: any}[] = [];
    for (const key of Object.keys(updated) as Array<keyof Event>) {
        if (excluded.has(key)) {
            continue;
        }
        const old = getValue(current, key, locale) || '-';
        const newV = getValue(updated, key, locale) || '-';
        if (!_.isEqual(old, newV)) {
            changedProps.push({name: translate(key as any, locale), old, new: newV});
        }
    }
    return changedProps;
}

export const getEventProps = (event: ApiEvent, locale: 'de' | 'fr', excludedProps: (keyof ApiEvent)[] = []) => {
    const excluded = new Set([...EXCLUDED_PROPS, ...excludedProps]);
    const eventProps: {name: string, value: any}[] = [];
    for (const key of Object.keys(event) as Array<keyof Event>) {
        if (excluded.has(key)) {
            continue;
        }
        eventProps.push({name: translate(key as any, locale), value: getValue(event, key, locale) || '-'});
    }
    return eventProps;
}