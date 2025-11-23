import { Department, Event, EventState, Prisma } from '@prisma/client';
import _ from 'lodash';

export interface ApiEvent
    extends Omit<Event, 'job' | 'author' | 'departments' | 'children' | 'clones' | 'meta'> {
    jobId: string | null;
    meta?: Prisma.JsonValue | null;
    authorId: string;
    departmentIds: string[];
    linkedUserIds: string[];
    publishedVersionIds: string[];
}

type CloneableEvent = Event & { departments: { id: string }[]; linkedUsers: { id: string }[] };
type FullClonedEvent = CloneableEvent & { groups: { id: string }[] };
interface CloneConfig {
    event: CloneableEvent;
    uid: string;
    type: 'basic';
}
interface AllPropsCloneConfig {
    event: CloneableEvent;
    uid: string;
    type: 'full';
    allProps?: boolean;
    includeGroups?: false;
}

interface FullCloneConfig {
    event: FullClonedEvent;
    uid: string;
    type: 'full';
    allProps?: boolean;
    includeGroups: true;
}

export const prepareEvent = (
    event: Event & {
        children?: { id: string; state: EventState; createdAt: Date }[];
        departments?: { id: string }[];
        linkedUsers?: { id: string }[];
    }
): ApiEvent => {
    const children = event?.children || [];
    const prepared: ApiEvent = {
        ...event,
        meta: event.meta || null,
        departmentIds: event?.departments?.map((d) => d.id) || [],
        publishedVersionIds: children
            .filter((e) => e.state === EventState.PUBLISHED)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((c) => c.id),
        linkedUserIds: event?.linkedUsers?.map((u) => u.id) || []
    };
    ['author', 'departments', 'linkedUsers', 'children', 'clones', 'clonedFrom', 'job'].forEach((key) => {
        delete (prepared as any)[key];
    });
    if (!event.meta) {
        delete (prepared as any).meta;
    }
    return prepared;
};

export const clonedUpdateProps = (
    config: CloneConfig | FullCloneConfig | AllPropsCloneConfig
): Prisma.EventUpdateInput => {
    const raw = clonedProps(config, true);
    /**
     * it **must** be a unchecked update.
     * reason: when calling update({data: { author: { connect: { id: some-others-id }}}})
     *         two queries are performed, and the one for the relation updates the `updatedAt` field... :(
     *         --> with uncheckedInput, this doesn't happen, because only one query is executed...
     */
    const cloned: Prisma.EventUpdateInput = { ...raw };
    if (cloned.departments) {
        cloned.departments = {
            set: cloned.departments.connect
        };
    } else {
        cloned.departments = {
            set: []
        };
    }
    if (cloned.linkedUsers) {
        cloned.linkedUsers = {
            set: cloned.linkedUsers.connect
        };
    } else {
        cloned.linkedUsers = {
            set: []
        };
    }
    if (!cloned.clonedFrom) {
        cloned.clonedFrom = { disconnect: true };
    }
    // cloned.clonedFromId = raw.clonedFrom?.connect?.id || null;
    // cloned.authorId = raw.author.connect!.id;
    // delete (cloned as any).author;
    // delete (cloned as any).clonedFrom;
    return cloned;
};

export const clonedProps = (
    config: CloneConfig | FullCloneConfig | AllPropsCloneConfig,
    cloneClonedFrom?: boolean
): Prisma.EventCreateInput => {
    const event = config.event;
    const clonedFromId = cloneClonedFrom ? event.clonedFromId : event.id;
    const props: Prisma.EventCreateInput = {
        start: event.start,
        end: event.end,
        audience: event.audience,
        description: event.description,
        cloned: event.cloned,
        location: event.location,
        descriptionLong: event.descriptionLong,
        teachingAffected: event.teachingAffected,
        clonedFrom: clonedFromId ? { connect: { id: clonedFromId } } : undefined,
        state: EventState.DRAFT,
        linkedUsers: { connect: event.linkedUsers.map((u) => ({ id: u.id })) || [] },
        author: { connect: { id: config.uid } }
    };
    if (event.departments.length > 0) {
        props.departments = {
            connect: event.departments.map((d) => ({ id: d.id }))
        };
    }
    const arrKeys: (keyof Event)[] = ['classGroups', 'classes'];
    arrKeys.forEach((key) => {
        if (event[key]) {
            (props as any)[key] = [...(event[key] as string[])];
        }
    });
    if (config.type === 'full') {
        if (config.includeGroups) {
            props.groups = {
                connect: config.event.groups.map((g) => ({ id: g.id }))
            };
        }
        props.meta = event.meta ? _.cloneDeep(event.meta) : undefined;
        if (config.allProps) {
            if (event.jobId) {
                props.job = { connect: { id: event.jobId } };
            }
            props.state = event.state;
            props.createdAt = event.createdAt;
            props.updatedAt = event.updatedAt;
            props.deletedAt = event.deletedAt;
            props.cloned = event.cloned;
        }
    }
    return props;
};

const currentGradeYear = (year: Date | string = new Date()) => {
    const refDate = new Date(year);
    return refDate.getFullYear() + (refDate.getMonth() < 7 ? 0 : 1);
};

export const normalizeAudience = (
    allDepartments: Department[],
    event: {
        departmentIds: string[];
        classGroups: string[];
        classes: string[];
        start: Date | string;
        end: Date | string;
    }
) => {
    const departmentIds = event.departmentIds;
    const gradeYear = currentGradeYear(event.start) % 100;
    const yearsShift = gradeYear === currentGradeYear(event.end) % 100 ? 0 : 1;
    const groups = new Set<string>(event.classGroups);
    const klasses = new Set<string>(event.classes);
    [...groups].forEach((g) => {
        // remove overlappings of already selected items
        if (g.length !== 3) {
            return groups.delete(g);
        }
        const letter = g.slice(2);
        const assignedDeps = allDepartments.filter((d) => d.letter === letter);
        if (assignedDeps.every((d) => departmentIds.includes(d.id))) {
            return groups.delete(g);
        }
        if (assignedDeps.length > 0) {
            try {
                const year = Number.parseInt(g.slice(0, 2), 10);
                const schoolYears = Math.max(...assignedDeps.map((d) => d.schoolYears));
                if (
                    Number.isNaN(year) ||
                    year < gradeYear ||
                    year > gradeYear + schoolYears - 1 + yearsShift
                ) {
                    return groups.delete(g);
                }
            } catch (e) {
                groups.delete(g);
            }
        }
    });
    [...klasses].forEach((k) => {
        if (k.length !== 4) {
            return klasses.delete(k);
        }
        const depLetter = k.slice(2, 3);
        const letter = k.slice(3);
        const assignedDep = allDepartments.find(
            (d) => d.letter === depLetter && d.classLetters.includes(letter)
        );
        if (!assignedDep) {
            return klasses.delete(k);
        }
        if (departmentIds.includes(assignedDep.id)) {
            return klasses.delete(k);
        }
        if (groups.has(k.slice(0, 3))) {
            return klasses.delete(k);
        }
        try {
            const year = Number.parseInt(k.slice(0, 2), 10);
            if (
                Number.isNaN(year) ||
                year < gradeYear ||
                year > gradeYear + assignedDep.schoolYears - 1 + yearsShift
            ) {
                return klasses.delete(k);
            }
        } catch (e) {
            return klasses.delete(k);
        }
    });
    return {
        classGroups: [...groups],
        classes: [...klasses]
    };
};
