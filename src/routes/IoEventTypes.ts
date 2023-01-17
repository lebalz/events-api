export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
    CHANGED_RECORD = 'CHANGED_RECORD',
}

export interface NewRecord {
    record: 'EVENT';
    id: string;
}

export interface ChangedRecord {
    record: 'EVENT';
    id: string;
}
