import { chunks } from "../../../src/services/helpers/splitInChunks";

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