import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { JobState, JobType, Role, Semester } from '@prisma/client';
import stubs from './stubs/semesters.json';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { faker } from '@faker-js/faker';
import Jobs from '../../src/models/jobs';
import { IoRoom } from '../../src/routes/socketEvents';

jest.mock('../../src/services/fetchUntis');
jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

const prepareSemester = (semester: Semester) => {
    return {
        ...JSON.parse(JSON.stringify(semester))
    }
}

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
});


describe(`GET ${API_URL}/semesters`, () => {
    it("returns all departments for public user", async () => {
        const semesters = await prisma.semester.findMany();
        const result = await request(app)
            .get(`${API_URL}/semesters`);
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(4);
        expect(result.body.map((d: Semester) => d.id).sort()).toEqual(semesters.map(d => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/semesters/:id`, () => {
    it("prevents public user to get department", async () => {
        const semetser = await prisma.semester.findFirst();
        const result = await request(app)
            .get(`${API_URL}/semesters/${semetser!.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can get department by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const semester = await prisma.semester.findFirst();
        const result = await request(app)
            .get(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareSemester(semester!));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});
describe(`PUT ${API_URL}/semesters/:id`, () => {
    it("prevents user to update semesters", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const dep = await prisma.semester.findFirst();
        const result = await request(app)
            .put(`${API_URL}/semesters/${dep!.id}`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("lets admins update semesters", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const semester = await prisma.semester.findFirst();
        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareSemester(semester!),
            name: 'FOO',
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'SEMESTER', id: semester!.id },
            to: 'all'
        });
    });
    it("can not update untis Sync Date to be earlier than the start of the semester", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { untisSyncDate: faker.date.past({refDate: semester?.start})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can not update start Date to be later than the end date", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { start: faker.date.future({refDate: semester?.end})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can not update start Date to be later than the sync date", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { start: faker.date.between({from: semester!.untisSyncDate, to: semester!.end})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can not update end Date to be earlier than the start date", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { end: faker.date.past({refDate: semester?.start})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can not update end Date to be earlier than the sync date", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { end: faker.date.between({from: semester!.start, to: semester!.untisSyncDate})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can not update untis Sync Date to be later than the end of the semester", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { untisSyncDate: faker.date.future({refDate: semester?.end})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can update semester with untis Sync Date between semester range", async () => {
        const semester = await prisma.semester.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { untisSyncDate: faker.date.between({from: semester!.start, to: semester!.end})}});
        expect(result.statusCode).toEqual(200);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'SEMESTER', id: semester!.id },
            to: 'all'
        });
    });
});

describe(`POST ${API_URL}/semesters`, () => {
    it("prevents user to create a semester", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/semesters`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({name: 'FOO', description: 'BAR'});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can create a new semester", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const start = faker.date.soon();
        const end = faker.date.future({refDate: start});
        const result = await request(app)
            .post(`${API_URL}/semesters`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({name: 'FOO', start: start, end: end });
        expect(result.statusCode).toEqual(201);
        expect(result.body.name).toEqual('FOO');
        expect(result.body.start).toEqual(start.toISOString());
        expect(result.body.end).toEqual(end.toISOString());
        expect(new Date(result.body.untisSyncDate).getTime()).toBeGreaterThan(start.getTime());
        expect(new Date(result.body.untisSyncDate).getTime()).toBeLessThan(end.getTime());

        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'SEMESTER', id: result.body.id },
            to: 'all'
        });
    });
});

describe(`DELETE ${API_URL}/semesters/:id`, () => {
    it("prevents user to delete a department", async () => {
        const semester = await prisma.semester.findFirst();
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .delete(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can delete a semester", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const semesters = await prisma.semester.findMany();
        expect(semesters).toHaveLength(4);
        const semester = semesters[0];
        const result = await request(app)
            .delete(`${API_URL}/semesters/${semester!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}));
        expect(result.statusCode).toEqual(204);
        const semestersAfter = await prisma.semester.findMany();
        expect(semestersAfter).toHaveLength(3);
        expect(semestersAfter.map(d => d.id)).not.toContain(semester!.id);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { record: 'SEMESTER', id: semester!.id },
            to: 'all'
        });
    });
});


describe(`POST ${API_URL}/semesters/:id/sync_untis`, () => {
    it("prevents user to sync with untis", async () => {
        const semester = await prisma.semester.findFirst();
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/semesters/${semester!.id}/sync_untis`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can sync a semester with untis", async () => {
        const semester = await prisma.semester.findFirst({where: {name: 'HS2023'}});
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .post(`${API_URL}/semesters/${semester!.id}/sync_untis`)
            .set('authorization', JSON.stringify({email: admin.email}));

        expect(result.statusCode).toEqual(201);
        expect(result.body.state).toEqual(JobState.PENDING);
        expect(result.body.type).toEqual(JobType.SYNC_UNTIS);

        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'JOB', id: result.body.id },
            to: IoRoom.ADMIN
        });

        
        /** wait for the import job to finish */
        let job = await Jobs.findModel(admin, result.body.id);
        while (job.state === JobState.PENDING) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            job = await Jobs.findModel(admin, result.body.id);
        }
        expect(job.state).toEqual(JobState.DONE);
        expect(job.semesterId).toEqual(semester!.id);
        expect(job.log).toEqual(expect.stringContaining(`"schoolyear":"2023/2024`));
        expect(job.log).toEqual(expect.stringContaining(`"syncedWeek":"${semester?.untisSyncDate?.toISOString().slice(0, 10)}`));
        expect(job.log).toEqual(expect.stringContaining(`"#subjects":2`));
        expect(job.log).toEqual(expect.stringContaining(`"#teachers":2`));
        expect(job.log).toEqual(expect.stringContaining(`"#classes":2`));
        expect(job.log).toEqual(expect.stringContaining(`"#lessons":3`));
    });
});