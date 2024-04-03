import _ from "lodash";
import { ApiEvent, prepareEvent } from "../../../src/models/event.helpers";
import { getDateTime } from "../../../src/services/helpers/time";
import { importCsv } from "../../../src/services/importGBJB_csv";
import { getChangedProps, getEventProps } from "../../../src/services/notifications/helpers/changedProps";
import { generateEvent } from "../../factories/event";
import { createEvent } from "./events.test";
import { createUser } from "./users.test";
import { translate } from "../../../src/services/helpers/i18n";

describe('import csv gbjb', () => {
    test('can extract raw event data', async () => {
        const result = await importCsv(`${__dirname}/../__fixtures__/gbjb.csv`);
        // even the csv has 4 data rows, only 3 are valid (coordination = 1, work = 0, planning = 0 are skipped)
        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
            description: 'Dispense',
            descriptionLong: 'Dispense de cours pour les élèves participant au concert de bienvenue',
            start: new Date('2023-08-22T00:00:00.000Z'),
            end: new Date('2023-08-23T00:00:00.000Z'),
            location: '',
            classesRaw: '',
        });
        expect(result[1]).toEqual({
            description: 'début OC/EF',
            descriptionLong: `Classes GYM 3 et GYM4:\ndébut de l'enseignement des disciplines de l'OC, selon horaire`,
            start: new Date('2023-08-25T14:55:00.000Z'),
            end: new Date('2023-08-25T15:40:00.000Z'),
            location: '',
            classesRaw: '',
        });
        expect(result[2]).toEqual({
            description: 'Présentation OP',
            descriptionLong: `Présentation des offres du GBJB autour de l'orientation professionnelle, à l'aula:\nClasses de GYM4 (24A à 24H et 24KL): 8h25-9h10\nClasses de GYM3 (25A à 25M et 25KL): 9h20-10h05\nClasses de GYM2 (26A à 26I et 26KLP): 11h20-12h05`,
            start: new Date('2023-08-29T08:25:00.000Z'),
            end: new Date('2023-08-29T12:05:00.000Z'),
            location: '',
            classesRaw: '24A 24H 24KL 25A 25M 25KL 26A 26I 26KLP',
        });
    });
});

describe('notifications > helpers > changedProps', () => {
    let current: ApiEvent;
    beforeEach(async () => {
        const user = await createUser({})
        const raw = await createEvent({authorId: user.id, start: new Date('2024-04-03T12:00:00.000Z'), end: new Date('2024-04-03T13:00:00.000Z')});
        current = prepareEvent(raw);
    });
    test('getChangedProps: no changes', () => {
        const updated = {...current} satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de');
        expect(changes).toHaveLength(0);
    });
    test('getChangedProps: string changes', () => {
        const updated = {...current, description: `${current.description} updated`} satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de');
        expect(changes).toHaveLength(1);
        expect(changes[0].path).toEqual(['description']);
        expect(changes[0].name).toEqual('Titel');
        expect(changes[0].oldValue).toEqual(current.description);
        expect(changes[0].value).toEqual(updated.description);
    });
    test('getChangedProps: date changes', () => {
        const updated = {...current, start: new Date('2024-04-03T12:45:00.000Z')} satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de');
        expect(changes).toHaveLength(1);
        expect(changes[0].path).toEqual(['start']);
        expect(changes[0].name).toEqual('Start');
        expect(changes[0].oldValue).toEqual(current.start);
        expect(changes[0].value).toEqual(updated.start);
    });
    test('getChangedProps: exclude props', () => {
        const updated = {...current, description: `${current.description} updated`} satisfies ApiEvent;
        const changes = getChangedProps(current, updated, 'de', ['description']);
        expect(changes).toHaveLength(0);
    });
})
describe('notifications > helpers > getEventProps', () => {
    let current: ApiEvent;
    beforeEach(async () => {
        const user = await createUser({})
        const raw = await createEvent({authorId: user.id, start: new Date('2024-04-03T12:00:00.000Z'), end: new Date('2024-04-03T13:00:00.000Z')});
        current = prepareEvent(raw);
    });
    test('getEventProps', () => {
        const eventProps = getEventProps(current, 'de');
        expect(_.orderBy(eventProps, ['name'])).toEqual(_.orderBy([
            {name: translate('description', 'de'), value: current.description},
            {name: translate('descriptionLong', 'de'), value: current.descriptionLong},
            {name: translate('classes', 'de'), value: current.classes},
            {name: translate('location', 'de'), value: current.location},
            {name: translate('start', 'de'), value: getDateTime(current.start)},
            {name: translate('end', 'de'), value: getDateTime(current.end)},
            {name: translate('updatedAt', 'de'), value: getDateTime(current.updatedAt)},
            {name: translate('deletedAt', 'de'), value: '-'},
            {name: translate('state', 'de'), value: translate('DRAFT', 'de')},
            {name: translate('teachingAffected', 'de'), value: translate('YES', 'de')},
            {name: translate('audience', 'de'), value: translate('STUDENTS', 'de')},
            {name: translate('classGroups', 'de'), value: current.classGroups},
        ], ['name']));
    });
    test('getEventProps: excluded Props', () => {
        const eventProps = getEventProps(current, 'de', ['classGroups']);
        expect(_.orderBy(eventProps, ['name'])).toEqual(_.orderBy([
            {name: translate('description', 'de'), value: current.description},
            {name: translate('descriptionLong', 'de'), value: current.descriptionLong},
            {name: translate('classes', 'de'), value: current.classes},
            {name: translate('location', 'de'), value: current.location},
            {name: translate('start', 'de'), value: getDateTime(current.start)},
            {name: translate('end', 'de'), value: getDateTime(current.end)},
            {name: translate('updatedAt', 'de'), value: getDateTime(current.updatedAt)},
            {name: translate('deletedAt', 'de'), value: '-'},
            {name: translate('state', 'de'), value: translate('DRAFT', 'de')},
            {name: translate('teachingAffected', 'de'), value: translate('YES', 'de')},
            {name: translate('audience', 'de'), value: translate('STUDENTS', 'de')}
        ], ['name']));
    });
})