import type {
    Department,
    EventGroup,
    EventState,
    Job,
    Prisma,
    RegistrationPeriod,
    Semester,
    User
} from '@prisma/client';
import { IoRoom } from './socketEvents';
import { ApiEvent } from '../models/event.helpers';
import { ApiUser } from '../models/user.helpers';
import { ApiSubscription } from '../models/subscription.helpers';

export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    DELETED_RECORD = 'DELETED_RECORD'
}

export enum RecordType {
    Event = 'EVENT',
    User = 'USER',
    Job = 'JOB',
    Department = 'DEPARTMENT',
    Semester = 'SEMESTER',
    RegistrationPeriod = 'REGISTRATION_PERIOD',
    EventGroup = 'EVENT_GROUP',
    Subscription = 'SUBSCRIPTION'
}

type TypeRecordMap = {
    [RecordType.Event]: ApiEvent;
    [RecordType.User]: ApiUser | User;
    [RecordType.Job]: Job;
    [RecordType.Department]: Department;
    [RecordType.Semester]: Semester;
    [RecordType.RegistrationPeriod]: RegistrationPeriod;
    [RecordType.EventGroup]: EventGroup;
    [RecordType.Subscription]: ApiSubscription;
};

export interface NewRecord<T extends RecordType> {
    type: T;
    record: TypeRecordMap[T];
}

export interface ChangedRecord<T extends RecordType> {
    type: T;
    record: TypeRecordMap[T];
}

export interface DeletedRecord {
    type: RecordType;
    id: string;
}

interface NotificationBase {
    to: IoRoom | string;
    toSelf?: true | boolean;
}

interface NotificationNewRecord extends NotificationBase {
    event: IoEvent.NEW_RECORD;
    message: NewRecord<RecordType>;
}

interface NotificationChangedRecord extends NotificationBase {
    event: IoEvent.CHANGED_RECORD;
    message: ChangedRecord<RecordType>;
}

interface NotificationDeletedRecord extends NotificationBase {
    event: IoEvent.DELETED_RECORD;
    message: DeletedRecord;
}

export type Notification = NotificationNewRecord | NotificationChangedRecord | NotificationDeletedRecord;

export enum IoEvents {
    AffectedLessons = 'affectedLessons',
    AffectedLessonsTmp = 'affectedLessons:tmp',
    AffectedTeachers = 'affectedTeachers',
    AffectedTeachersTmp = 'affectedTeachers:tmp'
}

export type ServerToClientEvents = {
    [IoEvent.NEW_RECORD]: (message: NewRecord<RecordType>) => void;
    [IoEvent.CHANGED_RECORD]: (message: ChangedRecord<RecordType>) => void;
    [IoEvent.DELETED_RECORD]: (message: DeletedRecord) => void;
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
