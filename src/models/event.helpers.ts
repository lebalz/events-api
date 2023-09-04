import { Department, Event, EventState, Job, Prisma, User } from "@prisma/client";
import { isNull } from "lodash";

export interface ApiEvent extends Omit<Event, 'jobId'> {
    job: undefined;
    jobId: string | undefined | null;
    author: undefined;
    authorId: string;
    departments: undefined;
    departmentIds: string[];
    children: undefined;
    versionIds: string[];
}

export const prepareEvent = (event: (Event & {
    children?: Event[];
    departments?: Department[];
})): ApiEvent => {
    const prepared = {
        ...event,
        job: undefined,
        author: undefined,
        departments: undefined,
        departmentIds: event?.departments?.map((d) => d.id) || [],
        children: undefined,
        versionIds: event?.children?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((c) => c.id) || [],
    };
    return prepared;
}

type EventProps = Prisma.EventUncheckedCreateInput;

export const clonedProps = (event: Event & {departments: Department[]}, uid: string, options: {full?: boolean, cloneUserGroup?: boolean} = {}): EventProps => {
    const props: EventProps = {
        start: event.start,
        end: event.end,
        klpOnly: event.klpOnly,
        description: event.description,
        cloned: event.cloned,
        teachersOnly: event.teachersOnly,
        location: event.location,
        descriptionLong: event.descriptionLong,
        teachingAffected: event.teachingAffected,
        state: EventState.DRAFT,
        authorId: uid
    }
    if (event.departments.length > 0) {
        props.departments = {
            connect: event.departments.map((d) => ({ id: d.id }))
        }
    }
    const arrKeys: (keyof Event)[] = ['classGroups', 'classes', 'subjects'];
    arrKeys.forEach((key) => {
        if (event[key]) {
            (props as any)[key] = [...(event[key] as string[])]
        }
    });
    if (options.full || options.cloneUserGroup) {
        props.userGroupId = event.userGroupId;
    }
    if (options.full) {
        props.jobId = event.jobId;
        props.state = event.state;
        props.createdAt = event.createdAt;
        props.updatedAt = event.updatedAt;
        props.deletedAt = event.deletedAt;
        props.cloned = event.cloned;
    }

    return props;
}