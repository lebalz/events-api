import prisma from '../../../src/prisma';
import { createUser } from "./users.test";
import { RPCreate, generateRegistrationPeriod } from "../../factories/registrationPeriod";
import RegistrationPeriods, { prepareRegistrationPeriod } from "../../../src/models/registrationPeriods";
import { faker } from '@faker-js/faker';
import { MINUTE_2_MS } from '../../../src/services/createIcs';
import { Department, RegistrationPeriod } from '@prisma/client';
import { generateDepartment } from '../../factories/department';
import { createDepartment } from './departments.test';

export const createRegistrationPeriod = async (props: RPCreate) => {
    return await prisma.registrationPeriod.create({ 
        data: generateRegistrationPeriod(props)
    });
}

describe('RegistrationPeriods', () => {
    test('find rp', async () => {
        const rp = await createRegistrationPeriod({});
        await expect(RegistrationPeriods.findModel(rp.id)).resolves.toEqual(prepareRegistrationPeriod(rp));
    });
    test('all', async () => {
        const rp = await createRegistrationPeriod({});
        const rp2 = await createRegistrationPeriod({});
        const res = await RegistrationPeriods.all();
        expect(res.map(r => r.id).sort()).toEqual([rp.id, rp2.id].sort());
    });
    test('createModel', async () => {
        const res = await RegistrationPeriods.createModel(
            { 
                name: 'Quartal 1',
                start: new Date('2024-04-13T12:00'), 
                end: new Date('2024-04-23T12:00'), 
                eventRangeStart: new Date('2024-06-01T12:00'), 
                eventRangeEnd: new Date('2024-06-28T12:00'),
            }
        );
        expect(res.start.toISOString().slice(0, 16)).toEqual('2024-04-13T12:00');
        expect(res.end.toISOString().slice(0, 16)).toEqual('2024-04-23T12:00');
        expect(res.eventRangeStart.toISOString().slice(0, 16)).toEqual('2024-06-01T12:00');
        expect(res.eventRangeEnd.toISOString().slice(0, 16)).toEqual('2024-06-28T12:00');
        expect(res.departmentIds).toEqual([]);            
    });
    describe('updateModel', () => {
        (['name', 'description'] as const).forEach((prop) => {
            test(`update '${prop}'`, async () => {
                const rp = await createRegistrationPeriod({});
                const updated = 'Im Flugi isches mängisch müesam';
                const res = await RegistrationPeriods.updateModel(rp.id, {[prop]: updated});
                expect(res[prop]).toEqual(updated);
            });
        });

        (['start', 'end', 'eventRangeStart', 'eventRangeEnd'] as const).forEach((prop) => {
            test(`update '${prop}'`, async () => {
                const rp = await createRegistrationPeriod({});
                const updated = new Date(rp[prop].getTime() + MINUTE_2_MS);
                const res = await RegistrationPeriods.updateModel(rp.id, {[prop]: updated});
                expect(res[prop].getTime()).toEqual(updated.getTime());
            });
        });
        test(`update 'isOpen'`, async () => {
            const rp = await createRegistrationPeriod({isOpen: false});
            expect(rp.isOpen).toBeFalsy();
            const res = await RegistrationPeriods.updateModel(rp.id, {isOpen: true});
            expect(res.isOpen).toBeTruthy();
        });
    });

    describe('openPeriods', () => {
        let gbsl: Department;
        let gbjb: Department;
        let gbslGbjb: Department;
        let rpGBSL: RegistrationPeriod;
        let rpGBJB: RegistrationPeriod;
        beforeEach(async () => {
            gbsl = await createDepartment({name: 'GBSL'});
            gbjb = await createDepartment({name: 'GBJB'});
            gbslGbjb = await createDepartment({name: 'GBSL/GBJB', department1_Id: gbsl.id, department2_Id: gbjb.id});
            const defaultProps = {
                start: new Date('2024-04-13T12:00'),
                end: new Date('2024-04-23T12:00'),
                eventRangeStart: new Date('2024-06-01T12:00'),
                eventRangeEnd: new Date('2024-06-28T12:00')
            } as const;
            rpGBSL = await createRegistrationPeriod({
                name: 'GBSL',
                departmentIds: [gbsl.id],
                ...defaultProps
            });
            rpGBJB = await createRegistrationPeriod({
                name: 'GBJB',
                departmentIds: [gbjb.id],
                ...defaultProps
            });
        });

        test('finds open periods', async () => {
            const resGBSL = await RegistrationPeriods.openPeriods(
                new Date('2024-04-13T12:00'),
                new Date('2024-06-28T12:00'),
                [gbsl.id]
            );
            expect(resGBSL.map(rp => rp.id)).toEqual([rpGBSL.id]);
            const resGBJB = await RegistrationPeriods.openPeriods(
                new Date('2024-04-23T12:00'),
                new Date('2024-06-01T12:00'),
                [gbjb.id]
            );
            expect(resGBJB.map(rp => rp.id)).toEqual([rpGBJB.id]);
        });

        test('returns empty, when date is outside reg period', async () => {
            const resA = await RegistrationPeriods.openPeriods(
                new Date('2024-04-13T11:59'),
                new Date('2024-06-13T12:00'),
                [gbsl.id, gbjb.id]
            );
            expect(resA).toHaveLength(0);
            const resB = await RegistrationPeriods.openPeriods(
                new Date('2024-04-23T12:01'),
                new Date('2024-06-13T12:00'),
                [gbsl.id, gbjb.id]
            );
            expect(resB).toHaveLength(0);
        });

        test('returns empty, when event start date is outside event range', async () => {
            const resA = await RegistrationPeriods.openPeriods(
                new Date('2024-04-14T12:00'),
                new Date('2024-06-28T12:01'),
                [gbsl.id, gbjb.id]
            );
            expect(resA).toHaveLength(0);
            const resB = await RegistrationPeriods.openPeriods(
                new Date('2024-04-14T12:00'),
                new Date('2024-06-01T11:59'),
                [gbsl.id, gbjb.id]
            );
            expect(resB).toHaveLength(0);
        });
    })
});