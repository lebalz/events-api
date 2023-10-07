import request from 'supertest';
import app, { API_URL } from '../../src/app';
import { send } from 'process';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';

describe(`GET ${API_URL}`, () => {
    it("returns 'Welcome to the EVENTS-API V1.0.'", async () => {
        const result = await request(app).get('/api/v1');
        expect(result.text).toEqual('Welcome to the EVENTES-API V1.0');
        expect(result.statusCode).toEqual(200);
    });
});

describe(`GET ${API_URL}/checklogin`, () => {
    it("returns 401 when not logged in", async () => {
        const result = await request(app).get(`${API_URL}/checklogin`);
        expect(result.statusCode).toEqual(401);
        expect(result.text).toEqual('Unauthorized');
    });
    it("returns 200 when logged in", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
                        .get(`${API_URL}/checklogin`)
                        .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.text).toEqual('OK');
    });
});
