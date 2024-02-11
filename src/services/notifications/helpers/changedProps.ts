import { Event } from "@prisma/client";
import { ApiEvent } from "../../../models/event.helpers";
import _ from "lodash";
import { translate } from "../../helpers/i18n";

const EXCLUDED_PROPS = new Set<keyof ApiEvent>([
    'id',
    'createdAt',
    'updatedAt',
    'authorId',
    'jobId',
    'userGroupId',
    'publishedVersionIds',
    'children',
    'affectsDepartment2',
    'parentId'
]);

export const getChangedProps = (current: ApiEvent, updated: ApiEvent) => {
    const changedProps: {name: string, old: any, new: any}[] = [];
    for (const key of Object.keys(updated) as Array<keyof Event>) {
        if (EXCLUDED_PROPS.has(key)) {
            continue;
        }
        if (current[key] instanceof Date || updated[key] instanceof Date) {
            const cDate = current[key] as Date | undefined;
            const uDate = updated[key] as Date | undefined;
            if (cDate?.toISOString() !== uDate?.toISOString()) {
                changedProps.push({name: translate(key, 'de'), old: cDate, new: uDate});
            }
        } else if (!_.isEqual(current[key], updated[key])) {
            changedProps.push({name: translate(key, 'de'), old: current[key] as string, new: updated[key] as string});
        }
    }
    return changedProps;
}