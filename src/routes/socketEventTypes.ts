export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
    DELETED_RECORD = 'DELETED_RECORD',
}

type RecordTypes = 'EVENT' | 'USER' | 'JOB' | 'DEPARTMENT' | 'SEMESTER';

export interface NewRecord {
    record: RecordTypes;
    id: string;
}

export interface ChangedRecord {
    record: RecordTypes;
    id: string;
}

export interface Notification {
    message: NewRecord | ChangedRecord;
    event: IoEvent;
    to?: string;
    toSelf?: boolean;
}