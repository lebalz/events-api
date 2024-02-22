import type { EventState } from "@prisma/client";
import { IoRoom } from "./socketEvents";

export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    CHANGED_STATE = 'CHANGED_STATE',
    DELETED_RECORD = 'DELETED_RECORD',
    RELOAD_AFFECTING_EVENTS = 'RELOAD_AFFECTING_EVENTS',
    CHANGED_MEMBERS = 'CHANGED_MEMBERS'
}

type RecordTypes = 'EVENT' | 'USER' | 'JOB' | 'DEPARTMENT' | 'SEMESTER' | 'REGISTRATION_PERIOD' | 'EVENT_GROUP';

export interface NewRecord {
    record: RecordTypes;
    id: string;
}

export interface ChangedRecord {
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
    semesterIds: string[];
}

export interface Notification {
    message: NewRecord | ChangedRecord | ChangedState | ReloadAffectingEvents | ChangedMembers;
    event: IoEvent;
    to: IoRoom | string;
    toSelf?: true | boolean;
}