import { importCsv } from "../../../src/services/importGBJB_csv";

describe('import csv gbjb', () => {
    test('can extract raw event data', async () => {
        const result = await importCsv(`${__dirname}/../__fixtures__/gbjb.csv`);
        // even the csv has 4 data rows, only 3 are valid (coordination = 1, work = 0, planning = 0 are skipped)
        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
            description: 'Dispense',
            descriptionLong: 'Dispense de cours pour les élèves participant au concert de bienvenue',
            start: new Date('2023-08-22T10:25:00.000Z'),
            end: new Date('2023-08-22T12:05:00.000Z'),
            location: '',
            classesRaw: '',
        });
        expect(result[1]).toEqual({
            description: 'début OC/EF',
            descriptionLong: `Classes GYM 3 et GYM4:\ndébut de l\\'enseignement des disciplines de l\\'OC, selon horaire`,
            start: new Date('2023-08-25T14:55:00.000Z'),
            end: new Date('2023-08-25T15:40:00.000Z'),
            location: '',
            classesRaw: '',
        });
        expect(result[2]).toEqual({
            description: 'Présentation OP',
            descriptionLong: `Présentation des offres du GBJB autour de l\\'orientation professionnelle, à l\\'aula:\nClasses de GYM4 (24A à 24H et 24KL): 8h25-9h10\\r\\nClasses de GYM3 (25A à 25M et 25KL): 9h20-10h05\\r\\nClasses de GYM2 (26A à 26I et 26KLP): 11h20-12h05`,
            start: new Date('2023-08-29T08:25:00.000Z'),
            end: new Date('2023-08-29T12:05:00.000Z'),
            location: '',
            classesRaw: '24A 24H 24KL 25A 25M 25KL 26A 26I 26KLP',
        });
    });
});