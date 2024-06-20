import type { EventState, Prisma } from '@prisma/client';
import { IoRoom } from './socketEvents';
import { ApiEvent } from '../models/event.helpers';
import { DefaultArgs } from '@prisma/client/runtime/library';

export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    CHANGED_STATE = 'CHANGED_STATE',
    DELETED_RECORD = 'DELETED_RECORD',
    RELOAD_AFFECTING_EVENTS = 'RELOAD_AFFECTING_EVENTS',
    CHANGED_MEMBERS = 'CHANGED_MEMBERS'
}

type RecordTypes =
    | 'EVENT'
    | 'USER'
    | 'JOB'
    | 'DEPARTMENT'
    | 'SEMESTER'
    | 'REGISTRATION_PERIOD'
    | 'EVENT_GROUP';

export interface NewRecord {
    record: RecordTypes;
    id: string;
}

export interface ChangedRecord {
    record: RecordTypes;
    id: string;
}

export interface DeletedRecord {
    record: RecordTypes;
    id: string;
}

export interface ChangedMembers {
    record: RecordTypes;
    id: string;
    memberType: RecordTypes;
    addedIds: string[];
    removedIds: string[];
}

export interface ChangedState {
    state: EventState;
    ids: string[];
}
export interface ReloadAffectingEvents {
    record: 'SEMESTER';
    semesterIds: string[];
}

type NotificationMessage = NewRecord | ChangedRecord | ChangedState | ReloadAffectingEvents | ChangedMembers;

export interface Notification {
    message: NotificationMessage;
    event: IoEvent;
    to: IoRoom | string;
    toSelf?: true | boolean;
}

export enum IoEvents {
    AffectedLessons = 'affectedLessons',
    AffectedLessonsTmp = 'affectedLessons:tmp',
    AffectedTeachers = 'affectedTeachers',
    AffectedTeachersTmp = 'affectedTeachers:tmp'
}

export type ServerToClientEvents = {
    [notification in IoEvent]: (message: NotificationMessage) => void;
};

export interface ClientToServerEvents {
    [IoEvents.AffectedLessons]: (
        event_id: string,
        semester_id: string,
        callback: (
            result:
                | { state: 'success'; lessons: Prisma.view_LessonsAffectedByEventsGetPayload<{}>[] }
                | { state: 'error'; message: string }
        ) => void
    ) => void;
    [IoEvents.AffectedLessonsTmp]: (
        event: ApiEvent,
        semester_id: string,
        callback: (
            result:
                | { state: 'success'; lessons: Prisma.view_LessonsAffectedByEventsGetPayload<{}>[] }
                | { state: 'error'; message: string }
        ) => void
    ) => void;
    [IoEvents.AffectedTeachers]: (
        event_id: string,
        semester_id: string,
        callback: (
            result: { state: 'success'; usersIds: string[] } | { state: 'error'; message: string }
        ) => void
    ) => void;
    [IoEvents.AffectedTeachersTmp]: (
        event: ApiEvent,
        semester_id: string,
        callback: (
            result: { state: 'success'; usersIds: string[] } | { state: 'error'; message: string }
        ) => void
    ) => void;
}
