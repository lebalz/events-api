import { JobType, Prisma } from "@prisma/client";
import { faker } from '@faker-js/faker';

const _generateJob = (props: Partial<Prisma.JobUncheckedCreateInput> & { userId: string, type: JobType }): Prisma.JobCreateInput => {
    return {
        user: { connect: { id: props.userId } },
        semester: props.semesterId ? { connect: { id: props.semesterId } } : undefined,
        ...props
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