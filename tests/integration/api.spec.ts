import request from 'supertest';
import app, { API_URL } from '../../src/app';

describe(`GET ${API_URL}`, () => {
    it("returns 'Welcome to the EVENTS-API V1.0.'", async () => {
        const result = await request(app).get('/api/v1');
        expect(result.text).toEqual('Welcome to the EVENTES-API V1.0');
        expect(result.statusCode).toEqual(200);
    });
});
