import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { EventState, JobState, Role, TeachingAffected } from '@prisma/client';
import { truncate } from './helpers/db';
import Jobs from '../../src/models/jobs';

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
        /** wait for the import job to finish */
        let job = await Jobs.findModel(admin, result.body.id);
        while (job.state === JobState.PENDING) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            job = await Jobs.findModel(admin, result.body.id);
        }
        expect(job.state).toEqual(JobState.DONE);

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
        expect(event1?.start).toEqual(new Date(Date.UTC(2023, 7, 21, 23, 59, 59)));
        expect(event1?.end).toEqual(new Date(Date.UTC(2023, 7, 21, 23, 59, 59)));
        expect(event1?.classes).toEqual([]);

        
        const event2 = events.find(e => e.description === '26Fa FMS1 Kurzklassenkonferenz');
        expect(event2?.descriptionLong).toEqual('');
        expect(event2?.location).toEqual('');
        expect(event2?.start).toEqual(new Date(Date.UTC(2023, 7, 24, 13, 15, 0)));
        expect(event2?.end).toEqual(new Date(Date.UTC(2023, 7, 24, 13, 30, 0)));
        expect(event2?.classes).toEqual([]);

        const event3 = events.find(e => e.description === 'Koordinationssitzung LK der neuen Bilingue-Klassen 27Gw, 27Gx, 27mT, 27mU');
        expect(event3?.descriptionLong).toEqual('');
        expect(event3?.location).toEqual('M208');
        expect(event3?.start).toEqual(new Date(Date.UTC(2023, 7, 24, 13, 15, 0)));
        expect(event3?.end).toEqual(new Date(Date.UTC(2023, 7, 24, 14, 0, 0)));
        expect(event3?.classes).toEqual([ '27Gw', '27Gx', '27mT', '27mU' ]);

        const event4 = events.find(e => e.description === 'Information IDAF 1 Geschichte / Französisch');
        expect(event4?.descriptionLong).toEqual('Die Lehrpersonen informieren die Klasse in einer der Lektionen über den Zeitpunkt und Ablauf des IDAF-Moduls');
        expect(event4?.location).toEqual('');
        expect(event4?.start).toEqual(new Date(Date.UTC(2023, 7, 28, 0, 0, 0)));
        expect(event4?.end).toEqual(new Date(Date.UTC(2023, 8, 1, 23, 59, 59)));
        expect(event4?.classes).toEqual([ '26Wa' ]);
    });
});
