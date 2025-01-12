import { Event, EventState, Prisma } from '@prisma/client';
import _ from 'lodash';

export interface ApiEvent
    extends Omit<Event, 'job' | 'author' | 'departments' | 'children' | 'clones' | 'meta'> {
    jobId: string | null;
    meta?: Prisma.JsonValue | null;
    authorId: string;
    departmentIds: string[];
    publishedVersionIds: string[];
}

type CloneableEvent = Event & { departments: { id: string }[] };
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
            .map((c) => c.id)
    };
    ['author', 'departments', 'children', 'clones', 'clonedFrom', 'job'].forEach((key) => {
        delete (prepared as any)[key];
    });
    if (!event.meta) {
        delete (prepared as any).meta;
    }
    return prepared;
};

export const clonedUpdateProps = (
    config: CloneConfig | FullCloneConfig | AllPropsCloneConfig
): Prisma.EventUncheckedUpdateInput => {
    const raw = clonedProps(config, true);
    /**
     * it **must** be a unchecked update.
     * reason: when calling update({data: { author: { connect: { id: some-others-id }}}})
     *         two queries are performed, and the one for the relation updates the `updatedAt` field... :(
     *         --> with uncheckedInput, this doesn't happen, because only one query is executed...
     */
    const cloned: Prisma.EventUncheckedUpdateInput = { ...raw };
    if (cloned.departments) {
        cloned.departments = {
            set: cloned.departments.connect
        };
    } else {
        cloned.departments = {
            set: []
        };
    }
    cloned.clonedFromId = raw.clonedFrom?.connect?.id || null;
    cloned.authorId = raw.author.connect!.id;
    delete (cloned as any).author;
    delete (cloned as any).clonedFrom;
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
