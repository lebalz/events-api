import { JobType, Prisma } from "@prisma/client";
import { faker } from '@faker-js/faker';

const _generateJob = (props: Partial<Prisma.JobUncheckedCreateInput> & { userId: string, type: JobType }): Prisma.JobCreateInput => {
    const {userId, semesterId, events} = props;
    delete (props as any).userId;
    delete props.semesterId;
    delete props.events;
    return {
        user: { connect: { id: userId } },
        semester: semesterId ? { connect: { id: semesterId } } : undefined,
        events: events,
        ...props,
    };
}

export const generateImportJob = (props: Partial<Prisma.JobUncheckedCreateInput> & { userId: string }): Prisma.JobCreateInput => {
    return _generateJob({
        type: 'IMPORT',
        description: faker.lorem.sentence(),
        filename: faker.system.fileName({ extensionCount: 4 }),
        log: faker.lorem.paragraphs(3),
        ...props
    });
}
export const generateSyncJob = (props: Partial<Prisma.JobUncheckedCreateInput> & { userId: string, semesterId: string }): Prisma.JobCreateInput => {
    return _generateJob({
        type: 'SYNC_UNTIS',
        syncDate: faker.date.recent(),
        ...props
    });
}

export const generateJob = (props: Partial<Prisma.JobUncheckedCreateInput> & ({ userId: string, type: 'IMPORT' } | { userId: string, type: 'SYNC_UNTIS', semesterId: string })): Prisma.JobCreateInput => {
    switch (props.type) {
        case 'IMPORT':
            return generateImportJob(props);
        case 'SYNC_UNTIS':
            return generateSyncJob(props);
    }
}

export const jobSequence = (count: number, props: Partial<Prisma.JobUncheckedCreateInput> & ({ userId: string, type: 'IMPORT' } | { userId: string, type: 'SYNC_UNTIS', semesterId: string })): Prisma.JobCreateInput[] => {
    return [...Array(count).keys()].map(i => generateJob(props));
}