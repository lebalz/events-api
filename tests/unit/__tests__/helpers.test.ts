import { findUser } from "../../../src/helpers";
import { Departments, toDepartmentName } from "../../../src/services/helpers/departmentNames";
import { KlassName } from "../../../src/services/helpers/klassNames";
import { chunks } from "../../../src/services/helpers/splitInChunks";
import prismock from "../__mocks__/prismockClient";

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

describe('findUser from auth info', () => {
    test('creates user from email and name', async () => {
        const authInfo = {
            preferred_username: 'Maximilian.Dorodan@abcd.ch',
            name: 'Dorodan Zingaro Maximilian',
            oid: 'a8407e9c-be32-46af-a69d-e35a569f76ad'
        };
        await expect(prismock.user.findMany()).resolves.toEqual([]);
        await findUser(authInfo);
        await expect(prismock.user.findMany()).resolves.toEqual([{
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
            email: 'maximilian.dorodan@abcd.ch',
            firstName: 'Maximilian',
            lastName: 'Dorodan Zingaro',
            icsLocator: null,
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
        await expect(prismock.user.findMany()).resolves.toEqual([]);
        await findUser(authInfo);
        await expect(prismock.user.findMany()).resolves.toEqual([{
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
            email: 'maximilian.dorodan@abcd.ch',
            firstName: 'Maximilian',
            lastName: 'Dorodan',
            icsLocator: null,
            role: 'USER',
            untisId: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
        }]);
    });
    test('updates user', async () => {
        await prismock.user.create({
            data: {
                id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
                email: 'Maximilian.Dorodan@abcd.ch',
                firstName: 'Maximilian',
                lastName: 'Dorodan'
            }
        });
        const old = await prismock.user.findFirst();
        expect(old?.lastName).toEqual('Dorodan');

        const authInfo = {
            preferred_username: 'Maximilian.Dorodan@abcd.ch',
            name: 'Dorodan Zingaro Maximilian',
            oid: 'a8407e9c-be32-46af-a69d-e35a569f76ad'
        };
        await findUser(authInfo);
        await expect(prismock.user.findMany()).resolves.toEqual([{
            id: 'a8407e9c-be32-46af-a69d-e35a569f76ad',
            email: 'maximilian.dorodan@abcd.ch',
            firstName: 'Maximilian',
            lastName: 'Dorodan Zingaro',
            icsLocator: null,
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