import type { EventState } from "@prisma/client";
import { IoRoom } from "./socketEvents";

export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    CHANGED_STATE = 'CHANGED_STATE',
    DELETED_RECORD = 'DELETED_RECORD',
}

type RecordTypes = 'EVENT' | 'USER' | 'JOB' | 'DEPARTMENT' | 'SEMESTER' | 'REGISTRATION_PERIOD' | 'USER_EVENT_GROUP';

export interface NewRecord {
    record: RecordTypes;
    id: string;
}

export interface ChangedRecord {
    record: RecordTypes;
    id: string;
}
export interface ChangedState {
    state: EventState;
    ids: string[];
}

export interface Notification {
    message: NewRecord | ChangedRecord | ChangedState;
    event: IoEvent;
    to: IoRoom | string;
    toSelf?: true | boolean;
}