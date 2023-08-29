import { Department, Event, EventState, Job, Prisma, User } from "@prisma/client";

export interface ApiEvent extends Event {
    job: undefined;
    jobId: string | null;
    author: undefined;
    authorId: string;
    departments: undefined;
    departmentIds: string[];
    children: undefined;
    versionIds: string[];
}

export const prepareEvent = (event: (Event & {
    children: Event[];
    departments: Department[];
})): ApiEvent => {
    return {
        ...event,
        job: undefined,
        author: undefined,
        departments: undefined,
        departmentIds: event?.departments.map((d) => d.id) || [],
        children: undefined,
        versionIds: event?.children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((c) => c.id) || [],
    };
}

type EventProps = Prisma.EventUncheckedCreateInput;

export const clonedProps = (event: Event & {departments: Department[]}, uid: string, options: {full?: boolean, cloneUserGroup?: boolean} = {}): EventProps => {
    const props: EventProps = {
        start: event.start,
        end: event.end,
        klpOnly: event.klpOnly,
        classes: event.classes,
        description: event.description,
        cloned: event.cloned,
        teachersOnly: event.teachersOnly,
        location: event.location,
        descriptionLong: event.descriptionLong,
        teachingAffected: event.teachingAffected,
        subjects: event.subjects,
        classGroups: event.classGroups,
        state: EventState.DRAFT,
        departments: {
            connect: event.departments.map((d) => ({ id: d.id }))
        },
        authorId: uid
    }
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