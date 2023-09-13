import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { Strategy, StrategyCreated, StrategyCreatedStatic } from 'passport';
import { ParsedQs } from 'qs';
import prisma from '../prisma';
import Logger from '../utils/logger';
class MockStrat extends Strategy {
    name = 'oauth-bearer';
    constructor() {
        super();
    }
    async authenticate(
        this: StrategyCreated<this, this & StrategyCreatedStatic>,
        req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
        options?: any
    ) {
        let where: { email: string } | { id: string } = { id: process.env.TEST_USER_ID || '-1' };
        if (process.env.NODE_ENV === 'test' && req.headers.authorization) {
            try {
                const auth = JSON.parse(req.headers.authorization) as { email: string };           
                where = { email: auth.email || ''};
            } catch (err) {
                Logger.error('Bearer Verify Error', err);
                return this.fail('Could not parse authorization header');
            }
        }
        const user = await prisma.user.findUnique({
            where: where
        }).catch((err: any) => {
            Logger.error('Bearer Verify Error', err);
            return this.fail(`No User found for ${where}`);
        });
        return this.success(user!, { preferred_username: user!.email });
    }
}

export const getStrategy = () => {
    const strategy = new MockStrat();
    return strategy;
};