import { findUser } from "../../../src/helpers/authInfo";
import { getNameFromEmail } from "../../../src/helpers/email";
import { Departments, toDepartmentName } from "../../../src/services/helpers/departmentNames";
import { KlassName } from "../../../src/services/helpers/klassNames";
import { chunks } from "../../../src/services/helpers/splitInChunks";
import prisma from '../../../src/prisma';
import { rmUndefined } from "../../../src/utils/filterHelpers";
import { stringify } from "../../../src/utils/logger";
import { HTTP401Error, HTTP500Error } from "../../../src/utils/errors/Errors";


describe('Split In Chunks', () => {
	test('fn chunks', async () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
        const squares = [];
        const fn = (item: number) => {
            return Promise.resolve(item * item)
        };

        const result = await chunks(items, fn, 5);
        expect(result).toEqual([1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196,225, 256, 289, 324, 361, 400]);
    });
});

describe('getNameFromEmail', () => {
    test('can extract user name from email', () => {
        const email = 'foo.bar@bazz.com';
        expect(getNameFromEmail(email)).toEqual({ firstName: 'Foo', lastName: 'Bar' });
    });
    test('ignores additional dot separated parts', () => {
        const email = 'foo.de.bar@bazz.com';
        expect(getNameFromEmail(email)).toEqual({ firstName: 'Foo', lastName: 'De' });
    });
    test('does not fail on single value name', () => {
        const email = 'foo@bazz.com';
        expect(getNameFromEmail(email)).toEqual({ firstName: 'Foo', lastName: '' });
    });
    test('does not fail on empty input', () => {
        const email = '';
        expect(getNameFromEmail(email)).toEqual({ firstName: '', lastName: '' });
    });
    test('does not fail on undefined input', () => {
        const email = undefined;
        expect(getNameFromEmail(email)).toEqual({ firstName: '', lastName: '' });
    });
    test('does not fail on wrong format', () => {
        const email = 'foobar';
        expect(getNameFromEmail(email)).toEqual({ firstName: 'Foobar', lastName: '' });
    });
});

describe('findUser from auth info', () => {
    test('creates user from email and name', async () => {
        const authInfo = {
            preferred_username: 'Maximilian.Dorodan@abcd.ch',
            name: 'Dorodan Zingaro Maximilian',
            oid: 'a8407e9c-be32-46af-a69d-e35a569f76ad'
        };
        await expect(prisma.user.findMany()).resolves.toEqual([]);
        await findUser(authInfo);
        await expect(prisma.user.findMany()).resolves.toEqual([{
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
            email: 'maximilian.dorodan@abcd.ch',
            firstName: 'Maximilian',
            lastName: 'Dorodan Zingaro',
            icsLocator: null,
            notifyOnEventUpdate: false,
            role: 'USER',
            untisId: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
        }]);
    });
    test('creates user from email', async () => {
        const authInfo = {
            preferred_username: 'Maximilian.Dorodan@abcd.ch',
            oid: 'a8407e9c-be32-46af-a69d-e35a569f76ad'
        };
        await expect(prisma.user.findMany()).resolves.toEqual([]);
        await findUser(authInfo);
        await expect(prisma.user.findMany()).resolves.toEqual([{
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
            email: 'maximilian.dorodan@abcd.ch',
            firstName: 'Maximilian',
            lastName: 'Dorodan',
            icsLocator: null,
            notifyOnEventUpdate: false,
            role: 'USER',
            untisId: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
        }]);
    });
    test('updates user', async () => {
        await prisma.user.create({
            data: {
                id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
                email: 'Maximilian.Dorodan@abcd.ch',
                firstName: 'Maximilian',
                lastName: 'Dorodan'
            }
        });
        const old = await prisma.user.findFirst();
        expect(old?.lastName).toEqual('Dorodan');

        const authInfo = {
            preferred_username: 'Maximilian.Dorodan@abcd.ch',
            name: 'Dorodan Zingaro Maximilian',
            oid: 'a8407e9c-be32-46af-a69d-e35a569f76ad'
        };
        await findUser(authInfo);
        await expect(prisma.user.findMany()).resolves.toEqual([{
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
            email: 'maximilian.dorodan@abcd.ch',
            firstName: 'Maximilian',
            lastName: 'Dorodan Zingaro',
            icsLocator: null,
            notifyOnEventUpdate: false,
            role: 'USER',
            untisId: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
        }]);
    });
    test('throws on wrong format', async () => {
        const authInfo = {
            preferredUsername: 'Maximilian.Dorodan@abcd.ch',
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad'
        };
        await expect(findUser(authInfo)).rejects.toEqual('No valid authorization provided');
        
    });
    test('throws on missing', async () => {
        const authInfo = undefined
        await expect(findUser(authInfo)).rejects.toEqual('No valid authorization provided');
    });
});

describe('Department Names', () => {
    test('Nothing when too short', () => {
        expect(toDepartmentName(undefined as unknown as KlassName)).toEqual('');
        expect(toDepartmentName('' as KlassName)).toEqual('');
        expect(toDepartmentName('2' as KlassName)).toEqual('');
        expect(toDepartmentName('27' as KlassName)).toEqual('');
        expect(toDepartmentName('Eifach Öppis' as KlassName)).toEqual(undefined);
    });
    // abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
    test('Wirtschaftsmittelschule [wms]', () => {
        'abc'.split('').forEach(letter => {
            expect(toDepartmentName(`27W${letter}` as KlassName)).toEqual(Departments.WMS);
        });
        'defghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27W${letter}` as KlassName)).not.toEqual(Departments.WMS);
        });
    });
    test('Fachmittelschule [fms]', () => {
        'abcdefghijklmno'.split('').forEach(letter => {
            expect(toDepartmentName(`27F${letter}` as KlassName)).toEqual(Departments.FMS);
        });
        'pqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27F${letter}` as KlassName)).not.toEqual(Departments.FMS);
        });
    });
    test('Fachmittelschule Bilingue [fms]', () => {
        'wxy'.split('').forEach(letter => {
            expect(toDepartmentName(`27F${letter}` as KlassName)).toEqual(Departments.FMSBilingual);
        });
        'abcdefghijklmnopqrstuvzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27F${letter}` as KlassName)).not.toEqual(Departments.FMSBilingual);
        });
    });
    test('FM Päd', () => {
        'pqrs'.split('').forEach(letter => {
            expect(toDepartmentName(`27F${letter}` as KlassName)).toEqual(Departments.FMPaed);
        });
        'abcdefghijklmnotuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27F${letter}` as KlassName)).not.toEqual(Departments.FMPaed);
        });
    });
    test('Gymnasium de', () => {
        'abcdefghijklmnopqrs'.split('').forEach(letter => {
            expect(toDepartmentName(`27G${letter}` as KlassName)).toEqual(Departments.GYMD);
        });
        'tuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27G${letter}` as KlassName)).not.toEqual(Departments.GYMD);
        });
    });
    test('Gymnasium de Bilingue', () => {
        'wxy'.split('').forEach(letter => {
            expect(toDepartmentName(`27G${letter}` as KlassName)).toEqual(Departments.GYMDBilingual);
        });
        'abcdefghijklmnopqrstuvzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27G${letter}` as KlassName)).not.toEqual(Departments.GYMDBilingual);
        });
    });
    test('Filière gymnasiale Maturité (gym fr)', () => {
        'ABCDEFGHIJKLMNOPQRS'.split('').forEach(letter => {
            expect(toDepartmentName(`27m${letter}` as KlassName)).toEqual(Departments.GYMF);
        });
        'abcdefghijklmnopqrstuvwxyzTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27m${letter}` as KlassName)).not.toEqual(Departments.GYMF);
        });
    });
    test('Filière gymnasiale Maturité Bilingue (gym fr)', () => {
        'TUV'.split('').forEach(letter => {
            expect(toDepartmentName(`27m${letter}` as KlassName)).toEqual(Departments.GYMFBilingual);
        });
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27m${letter}` as KlassName)).not.toEqual(Departments.GYMFBilingual);
        });
    });
    test('Ecole de Culture Générale [ecg]', () => {
        'ABCDEFGHIJKLMNO'.split('').forEach(letter => {
            expect(toDepartmentName(`27s${letter}` as KlassName)).toEqual(Departments.ECG);
        });
        'abcdefghijklmnopqrstuvwxyzPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27s${letter}` as KlassName)).not.toEqual(Departments.ECG);
        });
    });
    test('Filière Passerelle [passerelle]', () => {
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27p${letter}` as KlassName)).toEqual(Departments.PASSERELLE);
        });
        'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
            expect(toDepartmentName(`27p${letter}` as KlassName)).not.toEqual(Departments.PASSERELLE);
        });
    });
    test('Ecole Supérieure de Commerce [esc]', () => {
        'ABCD'.split('').forEach(letter => {
            expect(toDepartmentName(`27c${letter}` as KlassName)).toEqual(Departments.ESC);
        });
        'abcdefghijklmnopqrstuvwxyzEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            expect(toDepartmentName(`27c${letter}` as KlassName)).not.toEqual(Departments.ESC);
        });
    });

});

describe('Helper Function', () => {
    test('rm undefined', () => {
        const arr = [1, 2, undefined, 3, 4, undefined, 5, 6, undefined];
        expect(rmUndefined(arr)).toEqual([1, 2, 3, 4, 5, 6]);
    })

    test('stringify logger json objects', () => {
        const objA = { name: "Object A", reference: {} };
        const objB = { name: "Object B", reference: objA };
        objA.reference = objB;
        // circular reference should throw error
        expect(() => JSON.stringify(objA)).toThrowError('Converting circular structure to JSON');
        // the logger uses a cache to avoid circular references
        expect(stringify(objA)).toMatchInlineSnapshot(`
"{
  "name": "Object A",
  "reference": {
    "name": "Object B"
  }
}"
`);
    });

    test('Errors', () => {
        expect(() => {
            throw new HTTP401Error()
        }).toThrowError(HTTP401Error);
        expect(() => {
            throw new HTTP500Error()
        }).toThrowError(HTTP500Error);
    })
})