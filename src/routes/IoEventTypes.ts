export enum IoEvent {
    NEW_RECORD = 'NEW_RECORD',
}

export interface NewRecord {
    record: 'EVENT';
    state: 'DRAFT' | 'PUBLISHED';
    id: string;
}
