import _ from 'lodash';
import { ApiEvent, prepareEvent } from '../../../src/models/event.helpers';
import { createIcsForDepartments, prepareEvent as prepareIcsEvent } from '../../../src/services/createIcs';
import { getDateTime } from '../../../src/services/helpers/time';
import { importCsv } from '../../../src/services/importGBJB_csv';
import { getChangedProps, getEventProps } from '../../../src/services/notifications/helpers/changedProps';
import { generateEvent } from '../../factories/event';
import { createEvent } from './events.test';
import { createUser } from './users.test';
import { translate } from '../../../src/services/helpers/i18n';
import { createUntisClass } from './untisClasses.test';
import { createDepartment } from './departments.test';
import { Event, EventState, Semester, User } from '@prisma/client';
import { createIcsForClasses } from '../../../src/services/createIcs';
import { existsSync, readFileSync } from 'fs';
import { ICAL_DIR } from '../../../src/app';
import prisma from '../../../src/prisma';
import { createEvents } from 'ics';
import stubs from '../../integration/stubs/semesters.json';
import { syncUntis2DB } from '../../../src/services/syncUntis2DB';
import { generateUser } from '../../factories/user';
import { affectedLessons, affectedTeachers } from '../../../src/services/eventCheckUnpersisted';
import { DepartmentLetter, Departments } from '../../../src/services/helpers/departmentNames';

jest.mock('../../../src/services/fetchUntis');

export const withoutDTSTAMP = (str: string) => {
    return str.replace(/\s*DTSTAMP.*/g, '');
};

describe('import csv gbjb', () => {
    test('can extract raw event data', async () => {
        const result = await importCsv(`${__dirname}/../__fixtures__/gbjb.csv`);
        // even the csv has 4 data rows, only 3 are valid (coordination = 1, work = 0, planning = 0 are skipped)
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            description: 'Dispense',
            descriptionLong: 'Dispense de cours pour les élèves participant au concert de bienvenue',
            start: new Date('2023-08-22T00:00:00.000Z'),
            end: new Date('2023-08-23T00:00:00.000Z'),
            location: '',
            classesRaw: ''
        });
        expect(result[1]).toEqual({
            description: 'début OC/EF',
            descriptionLong: `Classes GYM 3 et GYM4:\ndébut de l'enseignement des disciplines de l'OC, selon horaire`,
            start: new Date('2023-08-25T14:55:00.000Z'),
            end: new Date('2023-08-25T15:40:00.000Z'),
            location: '',
            classesRaw: ''
        });
        expect(result[2]).toEqual({
            description: 'Présentation OP',
            descriptionLong: `Présentation des offres du GBJB autour de l'orientation professionnelle, à l'aula:\nClasses de GYM4 (24A à 24H et 24KL): 8h25-9h10\nClasses de GYM3 (25A à 25M et 25KL): 9h20-10h05\nClasses de GYM2 (26A à 26I et 26KLP): 11h20-12h05`,
            start: new Date('2023-08-29T08:25:00.000Z'),
            end: new Date('2023-08-29T12:05:00.000Z'),
            location: '',
            classesRaw: '24A 24H 24KL 25A 25M 25KL 26A 26I 26KLP'
        });
    });
});

describe('notifications > helpers > changedProps', () => {
    let current: ApiEvent;
    beforeEach(async () => {
        const user = await createUser({});
        const raw = await createEvent({
            authorId: user.id,
            start: new Date('2024-04-03T12:00:00.000Z'),
            end: new Date('2024-04-03T13:00:00.000Z')
        });
        current = prepareEvent(raw);
    });
    test('getChangedProps: no changes', () => {
        const updated = { ...current } satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de');
        expect(changes).toHaveLength(0);
    });
    test('getChangedProps: string changes', () => {
        const updated = { ...current, description: `${current.description} updated` } satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de');
        expect(changes).toHaveLength(1);
        expect(changes[0].path).toEqual(['description']);
        expect(changes[0].name).toEqual('Titel');
        expect(changes[0].oldValue).toEqual(current.description);
        expect(changes[0].value).toEqual(updated.description);
    });
    test('getChangedProps: date changes', () => {
        const updated = { ...current, start: new Date('2024-04-03T12:45:00.000Z') } satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de');
        expect(changes).toHaveLength(1);
        expect(changes[0].path).toEqual(['start']);
        expect(changes[0].name).toEqual('Start');
        expect(changes[0].oldValue).toEqual(current.start);
        expect(changes[0].value).toEqual(updated.start);
    });
    test('getChangedProps: exclude props', () => {
        const updated = { ...current, description: `${current.description} updated` } satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de', ['description']);
        expect(changes).toHaveLength(0);
    });
});
describe('notifications > helpers > getEventProps', () => {
    let current: ApiEvent;
    beforeEach(async () => {
        const user = await createUser({});
        const raw = await createEvent({
            authorId: user.id,
            start: new Date('2024-04-03T12:00:00.000Z'),
            end: new Date('2024-04-03T13:00:00.000Z')
        });
        current = prepareEvent(raw);
    });
    test('getEventProps', () => {
        const eventProps = getEventProps(current, 'de');
        expect(_.orderBy(eventProps, ['name'])).toEqual(
            _.orderBy(
                [
                    { name: translate('description', 'de'), value: current.description },
                    { name: translate('descriptionLong', 'de'), value: current.descriptionLong },
                    { name: translate('classes', 'de'), value: current.classes },
                    { name: translate('location', 'de'), value: current.location },
                    { name: translate('start', 'de'), value: getDateTime(current.start) },
                    { name: translate('end', 'de'), value: getDateTime(current.end) },
                    { name: translate('updatedAt', 'de'), value: getDateTime(current.updatedAt) },
                    { name: translate('deletedAt', 'de'), value: '-' },
                    { name: translate('state', 'de'), value: translate('DRAFT', 'de') },
                    { name: translate('teachingAffected', 'de'), value: translate('YES', 'de') },
                    { name: translate('audience', 'de'), value: translate('STUDENTS', 'de') },
                    { name: translate('classGroups', 'de'), value: current.classGroups }
                ],
                ['name']
            )
        );
    });
    test('getEventProps: excluded Props', () => {
        const eventProps = getEventProps(current, 'de', ['classGroups']);
        expect(_.orderBy(eventProps, ['name'])).toEqual(
            _.orderBy(
                [
                    { name: translate('description', 'de'), value: current.description },
                    { name: translate('descriptionLong', 'de'), value: current.descriptionLong },
                    { name: translate('classes', 'de'), value: current.classes },
                    { name: translate('location', 'de'), value: current.location },
                    { name: translate('start', 'de'), value: getDateTime(current.start) },
                    { name: translate('end', 'de'), value: getDateTime(current.end) },
                    { name: translate('updatedAt', 'de'), value: getDateTime(current.updatedAt) },
                    { name: translate('deletedAt', 'de'), value: '-' },
                    { name: translate('state', 'de'), value: translate('DRAFT', 'de') },
                    { name: translate('teachingAffected', 'de'), value: translate('YES', 'de') },
                    { name: translate('audience', 'de'), value: translate('STUDENTS', 'de') }
                ],
                ['name']
            )
        );
    });
});

describe('createIcs', () => {
    let event41i: Event;
    let event42h: Event;
    let eventGbsl: Event;
    beforeEach(async () => {
        const gbsl = await createDepartment({ name: 'GYMD' });
        const author = await createUser({});
        await createUntisClass({ name: '41i', year: 2041, departmentId: gbsl.id });
        await createUntisClass({ name: '42h', year: 2042, departmentId: gbsl.id });
        event41i = await createEvent({
            start: new Date(Date.now() + 1000),
            end: new Date(Date.now() + 2000),
            authorId: author.id,
            state: EventState.PUBLISHED,
            classes: ['41i']
        });
        event42h = await createEvent({
            start: new Date(Date.now() + 1000),
            end: new Date(Date.now() + 2000),
            authorId: author.id,
            state: EventState.PUBLISHED,
            classes: ['42h']
        });
        eventGbsl = await createEvent({
            start: new Date(Date.now() + 1000),
            end: new Date(Date.now() + 2000),
            authorId: author.id,
            state: EventState.PUBLISHED,
            departmentIds: [gbsl.id]
        });
    });
    describe('for classes', () => {
        test('creates ics for classes', async () => {
            await createIcsForClasses();
            expect(existsSync(`${ICAL_DIR}/de/41i.ics`)).toBeTruthy();
            expect(existsSync(`${ICAL_DIR}/de/42h.ics`)).toBeTruthy();
            expect(existsSync(`${ICAL_DIR}/fr/41i.ics`)).toBeTruthy();
            expect(existsSync(`${ICAL_DIR}/fr/42h.ics`)).toBeTruthy();
            const icalDe41i = withoutDTSTAMP(readFileSync(`${ICAL_DIR}/de/41i.ics`, { encoding: 'utf-8' }));
            const icsDe41i = withoutDTSTAMP(
                createEvents([prepareIcsEvent(event41i, 'de', {}), prepareIcsEvent(eventGbsl, 'de', {})])
                    .value!
            )
                .replace('END:VCALENDAR', '')
                .split('BEGIN:VEVENT')
                .slice(1)
                .map((e, idx) => `BEGIN:VEVENT${e}`.trim());
            icsDe41i.forEach((e, idx) => expect(icalDe41i).toContain(e));

            const icalDe42h = withoutDTSTAMP(readFileSync(`${ICAL_DIR}/fr/42h.ics`, { encoding: 'utf-8' }));
            const icsDe42h = withoutDTSTAMP(
                createEvents([prepareIcsEvent(event42h, 'fr', {}), prepareIcsEvent(eventGbsl, 'fr', {})])
                    .value!
            )
                .replace('END:VCALENDAR', '')
                .split('BEGIN:VEVENT')
                .slice(1)
                .map((e, idx) => `BEGIN:VEVENT${e}`.trim());
            icsDe42h.forEach((e, idx) => expect(icalDe42h).toContain(e));
        });
    });

    describe('for departments', () => {
        test('creates ics for classes', async () => {
            await createIcsForDepartments();
            expect(existsSync(`${ICAL_DIR}/de/GYMD.ics`)).toBeTruthy();
            expect(existsSync(`${ICAL_DIR}/fr/GYMD.ics`)).toBeTruthy();
            const icalDeGbsl = withoutDTSTAMP(readFileSync(`${ICAL_DIR}/de/GYMD.ics`, { encoding: 'utf-8' }));
            const icsDeGbsl = withoutDTSTAMP(
                createEvents([
                    prepareIcsEvent(event41i, 'de', {}),
                    prepareIcsEvent(event42h, 'de', {}),
                    prepareIcsEvent(eventGbsl, 'de', {})
                ]).value!
            )
                .replace('END:VCALENDAR', '')
                .split('BEGIN:VEVENT')
                .slice(1)
                .map((e, idx) => `BEGIN:VEVENT${e}`.trim());
            icsDeGbsl.forEach((e, idx) => expect(icalDeGbsl).toContain(e));
        });
    });
});

describe('sync untis', () => {
    let semester: Semester;
    beforeEach(async () => {
        await prisma.semester.create({
            data: {
                name: 'HS2023',
                start: new Date('2023-08-01T00:00:00.000Z'),
                end: new Date('2024-01-31T23:59:59.999Z'),
                untisSyncDate: new Date('2023-10-10T10:00:00.000Z')
            }
        });
        semester = await prisma.semester.findFirstOrThrow({ where: { name: 'HS2023' } });
        await syncUntis2DB(semester!.id);
        const teachers = await prisma.untisTeacher.findMany();
        for (const teacher of teachers) {
            await prisma.user.create({ data: generateUser({ untisId: teacher.id }) });
        }
    });
    it('creates departments', async () => {
        const departments = await prisma.department.findMany();
        expect(departments).toHaveLength(13);
        expect(departments.map((d) => d.name).sort()).toEqual(
            [
                'WMS',
                'ESC',
                'FMPäd',
                'MSOP',
                'FMS',
                'FMS/ECG',
                'ECG',
                'ECG/FMS',
                'GYMF',
                'GYMF/GYMD',
                'GYMD',
                'GYMD/GYMF',
                'Passerelle'
            ].sort()
        );
        expect(departments.filter((d) => !!d.displayLetter).length).toEqual(2);
        const fmpaed = departments.find((d) => d.name === Departments.FMPaed)!;
        const msop = departments.find((d) => d.name === Departments.MSOP)!;
        expect(fmpaed.displayLetter).toEqual(DepartmentLetter.FMS);
        expect(fmpaed.letter).toEqual(DepartmentLetter.FMPaed);
        expect(msop.displayLetter).toEqual(DepartmentLetter.ECG);
        expect(msop.letter).toEqual(DepartmentLetter.MSOP);
    });
    it('creates classes and connects them to departments', async () => {
        const klasses = await prisma.untisClass.findMany({ include: { department: true, teachers: true } });
        console.log(JSON.stringify(klasses, null, 2));
        expect(klasses).toHaveLength(5);
        expect(klasses.map((d) => d.displayName ?? d.name).sort()).toEqual(
            ['25h', '24i', '27Gj', '27Fp', '27sS'].sort()
        );
        expect(klasses.map((d) => d.name).sort()).toEqual(['25Gh', '24Gi', '27Gj', '27Ep', '27eS'].sort());
    });
    it('creates lessons and connects classes and teachers', async () => {
        const lessons = await prisma.untisLesson.findMany({ include: { classes: true, teachers: true } });
        expect(lessons).toHaveLength(6);
        // @see fetchUntis.stub.json
        const M_25h = lessons.find((l) => l.id === 999)!;
        const IN_25h = lessons.find((l) => l.id === 1001)!;
        const M_24i = lessons.find((l) => l.id === 1003)!;
        const KS_27Gj = lessons.find((l) => l.id === 1004)!;
        const KS_27Fp = lessons.find((l) => l.id === 1005)!;
        const MC_27sS = lessons.find((l) => l.id === 1006)!;
        expect(M_25h.subject).toEqual('M');
        expect(M_25h.classes.map((c) => c.name)).toEqual(['25Gh']);
        expect(M_25h.teachers.map((t) => t.name)).toEqual(['abc']);

        expect(IN_25h.subject).toEqual('IN');
        expect(IN_25h.classes.map((c) => c.name)).toEqual(['25Gh']);
        expect(IN_25h.teachers.map((t) => t.name)).toEqual(['abc']);

        expect(M_24i.subject).toEqual('M');
        expect(M_24i.classes.map((c) => c.name)).toEqual(['24Gi']);
        expect(M_24i.teachers.map((t) => t.name)).toEqual(['xyz']);

        expect(KS_27Gj.subject).toEqual('KS');
        expect(KS_27Gj.classes.map((c) => c.name)).toEqual(['27Gj']);
        expect(KS_27Gj.teachers.map((t) => t.name)).toEqual(['cdf']);

        expect(KS_27Fp.subject).toEqual('KS');
        expect(KS_27Fp.classes.map((c) => c.name)).toEqual(['27Ep']);
        expect(KS_27Fp.teachers.map((t) => t.name)).toEqual(['efg']);

        expect(MC_27sS.subject).toEqual('MC');
        expect(MC_27sS.classes.map((c) => c.name)).toEqual(['27eS']);
        expect(MC_27sS.teachers.map((t) => t.name)).toEqual(['FGH']);
    });
});

describe('event > check > unpersisted', () => {
    let user: User;
    let semester: Semester;

    beforeEach(async () => {
        await prisma.semester.createMany({
            data: stubs.map((e: any) => ({
                id: e.id,
                name: e.name,
                start: e.start,
                end: e.end,
                untisSyncDate: e.untisSyncDate
            }))
        });
        user = await prisma.user.create({ data: generateUser({}) });
        semester = await prisma.semester.findFirstOrThrow({ where: { name: 'HS2023' } });
        await syncUntis2DB(semester!.id);
        const teachers = await prisma.untisTeacher.findMany();
        for (const teacher of teachers) {
            await prisma.user.create({ data: generateUser({ untisId: teacher.id }) });
        }
    });

    it('creates and destroys temporary event', async () => {
        expect(prisma.event.count()).resolves.toBe(0);
        const tmpEventData = generateEvent({
            authorId: 'whatever-gets-replaced',
            start: new Date('2023-10-10T14:00:00.000Z'),
            end: new Date('2023-10-10T15:00:00.000Z')
        });
        const res = await affectedLessons(
            user.id,
            prepareEvent(tmpEventData as unknown as Event),
            semester.id
        );
        expect(res).toHaveLength(0);
        expect(prisma.event.count()).resolves.toBe(0);
    });

    it('returns affected lessons', async () => {
        expect(prisma.event.count()).resolves.toBe(0);
        const tmpEventData = generateEvent({
            authorId: 'whatever-gets-replaced',
            start: new Date('2023-10-10T14:00:00.000Z'),
            end: new Date('2023-10-10T15:00:00.000Z'),
            classes: ['25Gh']
        });
        const res = await affectedLessons(
            user.id,
            prepareEvent(tmpEventData as unknown as Event),
            semester.id
        );
        expect(res).toHaveLength(1);
        expect(res[0].subject).toEqual('M');
        expect(res[0].startHHMM).toEqual(1455);
        expect(res[0].endHHMM).toEqual(1540);
        expect(res[0].teacherIds).toHaveLength(1);
        expect(res[0].teacherIds[0]).toEqual(1);
        expect(prisma.event.count()).resolves.toBe(0);
    });
    it('returns affected teachers', async () => {
        expect(prisma.event.count()).resolves.toBe(0);
        const tmpEventData = generateEvent({
            authorId: 'whatever-gets-replaced',
            start: new Date('2023-10-10T14:00:00.000Z'),
            end: new Date('2023-10-10T15:00:00.000Z'),
            classes: ['25Gh']
        });
        const expectedUser = await prisma.user.findFirstOrThrow({ where: { untisId: 1 } });
        const res = await affectedTeachers(
            user.id,
            prepareEvent(tmpEventData as unknown as Event),
            semester.id
        );
        expect(res).toHaveLength(1);
        expect(res[0]).toEqual(expectedUser.id);
        expect(prisma.event.count()).resolves.toBe(0);
    });
});
