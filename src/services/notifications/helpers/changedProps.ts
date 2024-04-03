import { Event } from "@prisma/client";
import { ApiEvent } from "../../../models/event.helpers";
import _, { filter } from "lodash";
import { i18nKey, translate } from "../../helpers/i18n";
import { getDateTime } from "../../helpers/time";
import diff, { DifferenceChange } from "microdiff";

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
    const changes = diff(current, updated);
    return changes
        .filter((change) => change.path.length === 1)
        .filter((change) => !excluded.has(change.path[0] as keyof ApiEvent))
        .filter((change) => change.type === 'CHANGE')
        .map((change) => ({...change, name: translate(change.path[0] as i18nKey, locale)})) as (DifferenceChange & {name: string})[];
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