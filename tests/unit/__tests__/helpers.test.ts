import { findUser } from "../../../src/helpers";
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
});