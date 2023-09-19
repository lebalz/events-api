import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { EventState, JobState, Role, TeachingAffected } from '@prisma/client';
import { truncate } from './helpers/db';
import Jobs from '../../src/models/jobs';
import { HTTP403Error } from '../../src/utils/errors/Errors';

describe(`POST ${API_URL}/event/import`, () => {
    afterEach(() => {
        return truncate();
    });
    it("lets admins import events", async () => {
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });

        const result = await request(app)
            .post(`${API_URL}/event/import`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .attach('terminplan', `${__dirname}/stubs/terminplan-import.xlsx`)
        expect(result.statusCode).toEqual(200);
        expect(result.body.state).toEqual(JobState.PENDING);
        expect(result.body.filename).toEqual('terminplan-import.xlsx');
        /** wait for the import job to finish */
        let job = await Jobs.findModel(admin, result.body.id);
        while (job.state === JobState.PENDING) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            job = await Jobs.findModel(admin, result.body.id);
        }
        expect(job.state).toEqual(JobState.DONE);
        expect(job.log).toEqual('');

        const events = await prisma.event.findMany();
        expect(events.length).toEqual(4);
        events.forEach((e) => {
            expect(e.state).toEqual(EventState.DRAFT);
            expect(e.teachingAffected).toEqual(TeachingAffected.YES);
            expect(e.cloned).toBeFalsy();
            expect(e.jobId).toEqual(job.id);
            expect(e.parentId).toBeNull();
            expect(e.userGroupId).toBeNull();
            expect(e.subjects).toEqual([]);
            expect(e.teachersOnly).toBeFalsy();
            expect(e.klpOnly).toBeFalsy();
            expect(e.deletedAt).toBeNull();
            expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
            expect(e.classGroups).toEqual([]);
        });
        const event1 = events.find(e => e.description === '1. Schultag gemäss Programm');
        expect(event1?.descriptionLong).toEqual('');
        expect(event1?.location).toEqual('GBSL');
        expect(event1?.start.toISOString()).toEqual('2023-08-21T23:59:59.000Z');
        expect(event1?.end.toISOString()).toEqual('2023-08-21T23:59:59.000Z');
        expect(event1?.classes).toEqual([]);

        
        const event2 = events.find(e => e.description === '26Fa FMS1 Kurzklassenkonferenz');
        expect(event2?.descriptionLong).toEqual('');
        expect(event2?.location).toEqual('');
        expect(event2?.start.toISOString()).toEqual('2023-08-24T12:15:00.000Z');
        expect(event2?.end.toISOString()).toEqual('2023-08-24T12:30:00.000Z');
        expect(event2?.classes).toEqual([]);

        const event3 = events.find(e => e.description === 'Koordinationssitzung LK der neuen Bilingue-Klassen 27Gw, 27Gx, 27mT, 27mU');
        expect(event3?.descriptionLong).toEqual('');
        expect(event3?.location).toEqual('M208');
        expect(event3?.start.toISOString()).toEqual('2023-08-24T12:15:00.000Z');
        expect(event3?.end.toISOString()).toEqual('2023-08-24T13:00:00.000Z');
        expect(event3?.classes).toEqual([ '27Gw', '27Gx', '27mT', '27mU' ]);

        const event4 = events.find(e => e.description === 'Information IDAF 1 Geschichte / Französisch');
        expect(event4?.descriptionLong).toEqual('Die Lehrpersonen informieren die Klasse in einer der Lektionen über den Zeitpunkt und Ablauf des IDAF-Moduls');
        expect(event4?.location).toEqual('');
        expect(event4?.start.toISOString()).toEqual('2023-08-28T00:00:00.000Z');
        expect(event4?.end.toISOString()).toEqual('2023-09-01T23:59:59.000Z');
        expect(event4?.classes).toEqual([ '26Wa' ]);
    });

    it("prevents users from importing events", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });

        const result = await request(app)
            .post(`${API_URL}/event/import`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .attach('terminplan', `${__dirname}/stubs/terminplan-import.xlsx`);
        expect(result.statusCode).toEqual(403);
    });
    it("lets logs failed import", async () => {
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });

        const result = await request(app)
            .post(`${API_URL}/event/import`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .attach('terminplan', `${__dirname}/stubs/terminplan-corrupted.xlsx`)
        expect(result.statusCode).toEqual(200);
        expect(result.body.state).toEqual(JobState.PENDING);
        expect(result.body.filename).toEqual('terminplan-corrupted.xlsx');
        /** wait for the import job to finish */
        let job = await Jobs.findModel(admin, result.body.id);
        while (job.state === JobState.PENDING) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            job = await Jobs.findModel(admin, result.body.id);
        }
        expect(job.state).toEqual(JobState.ERROR);
        expect(job.log).toEqual(expect.any(String));
        expect(job.log.length).toBeGreaterThan(0);
        const events = await prisma.event.findMany();
        expect(events.length).toEqual(0);
    });
});
