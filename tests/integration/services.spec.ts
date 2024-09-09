import { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { Department, EventGroup, Role, Semester, UntisTeacher } from '@prisma/client';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { generateUntisData, UntisDataProps } from '../factories/untisData';
import { syncUntis2DB } from '../../src/services/syncUntis2DB';
import { fetchUntis } from '../../src/services/__mocks__/fetchUntis';
import { affectedLessons } from '../../src/services/eventChecker';

jest.mock('../../src/services/fetchUntis');
jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;
const DEFAULT_INCLUDE_CONFIG = { events: { select: { id: true } }, users: { select: { id: true } } };

describe(`GET ${API_URL}/users/:id/affected-event-ids`, () => {
    describe('with existing semesters', () => {
        let semester: Semester;
        let departments: Department[];
        let untisTeachers: UntisTeacher[];
        const _data: UntisDataProps = {
            schoolyear: { start: 2024 },
            subjects: [
                { name: 'SPF', longName: 'Sport Frauen' },
                { name: 'SPH', longName: 'Sport Herren' },
                { name: 'MC', longName: 'Klassenstunde' },
                { name: 'HB', longName: 'Bio' }
            ],
            teachers: [
                { name: 'ROH', longName: 'RRR OOH [GYMD, GYMF]', sex: 'F' },
                { name: 'GIO', longName: 'GGG IIO [GYMF]', sex: 'M' },
                { name: 'frn', longName: 'fff rrn [GYMD]', sex: 'M' }
            ],
            classes: [
                { name: '26sT', sf: 'BG/WR' },
                { name: '27mU', sf: 'PAM' },
                { name: '27Gw', sf: 'PAM/BG' },
                { name: '27mT', sf: 'BC' }
            ],
            lessons: [
                {
                    subject: 'SPF',
                    day: 'Do',
                    teachers: ['ROH'],
                    classes: ['27mT', '27Gw'],
                    start: 1025,
                    end: 1205,
                    room: 'D114'
                },
                {
                    subject: 'SPH',
                    day: 'Do',
                    teachers: ['GIO'],
                    classes: ['27mU', '27Gw'],
                    start: 1025,
                    end: 1205,
                    room: 'D113'
                },
                {
                    subject: 'MC',
                    day: 'Fr',
                    teachers: ['GIO'],
                    classes: ['26sT'],
                    start: 730,
                    end: 815,
                    room: 'D113'
                },
                {
                    subject: 'HB',
                    day: 'Do',
                    teachers: ['frn'],
                    classes: ['26sT'],
                    start: 1025,
                    end: 1205,
                    room: 'D113'
                }
            ]
        };
        let data: UntisDataProps = _.cloneDeep(_data);
        beforeEach(async () => {
            await prisma.semester.create({
                data: {
                    name: 'HS2024',
                    start: new Date('2024-08-16'),
                    end: new Date('2025-01-31'),
                    untisSyncDate: new Date('2024-09-09')
                }
            });
            semester = (await prisma.semester.findFirst({ where: { name: 'HS2024' } })) as Semester;
            await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
            untisTeachers = await prisma.untisTeacher.findMany();
            departments = await prisma.department.findMany();
        });
        describe('returns affected lessons', () => {
            it('returns all affected lessons', async () => {
                const author = await prisma.user.create({
                    data: generateUser({ role: Role.ADMIN })
                });
                for (const tchr of untisTeachers) {
                    await prisma.user.create({
                        data: generateUser({ untisId: tchr.id, role: Role.USER })
                    });
                }
                const ecgFms = departments.find((d) => d.name === 'ECG/FMS') as Department;
                const event = await prisma.event.create({
                    data: {
                        start: new Date('2024-09-05T09:20:00.000Z'),
                        end: new Date('2024-09-05T12:05:00.000Z'),
                        location: 'Aula',
                        description: 'Auslese GBSL #2: Pedro Lenz',
                        descriptionLong: 'Autorenlesung mit Pedro Lenz',
                        state: 'PUBLISHED',
                        teachingAffected: 'YES',
                        audience: 'STUDENTS',
                        affectsDepartment2: false,
                        classes: [
                            '25Gb',
                            '25Gi',
                            '26Gb',
                            '26Gc',
                            '26Gd',
                            '26Ge',
                            '26Gg',
                            '26Gi',
                            '27Ga',
                            '27Gc',
                            '27Gj',
                            '28Ga',
                            '28Gh',
                            '27mT',
                            '27Gw',
                            '28mT',
                            '28Gx',
                            '25Gf',
                            '25Gh'
                        ],
                        departments: { connect: [{ id: ecgFms.id }] },
                        author: {
                            connect: { id: author.id }
                        }
                    }
                });
                const affected = await affectedLessons(event.id, semester.id);
                expect(affected.length).toEqual(3);
                const roh = untisTeachers.find((t) => t.name === 'ROH')!;
                const gio = untisTeachers.find((t) => t.name === 'GIO')!;
                const frn = untisTeachers.find((t) => t.name === 'frn')!;
                const untisClasses = await prisma.untisClass.findMany();
                const c26sT = untisClasses.find((c) => c.name === '26sT')!;
                const c27Gw = untisClasses.find((c) => c.name === '27Gw')!;
                const c27mT = untisClasses.find((c) => c.name === '27mT')!;

                const spfRoh = affected.find((a) => a.teacherIds.includes(roh.id) && a.subject === 'SPF')!;
                const hbFrn = affected.find((a) => a.teacherIds.includes(frn.id) && a.subject === 'HB')!;
                const sphGio = affected.find((a) => a.teacherIds.includes(gio.id) && a.subject === 'SPH')!;
                expect(hbFrn.classIds).toEqual([c26sT.id]);
                expect(spfRoh.classIds.sort()).toEqual([c27mT.id, c27Gw.id].sort());
                expect(sphGio.classIds).toEqual([c27Gw.id]); /** 27mU is not affected */
            });
        });
    });
});
