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
        // return this.success(user, { preferred_username: auth.email });
        const user = await prisma.user.findUnique({
            where: {
                id: process.env.TEST_USER_ID || '-1'
            }
        }).catch((err: any) => {
            Logger.error('Bearer Verify Error', err);
            return this.fail(`No User found for ${process.env.TEST_USER_ID}`);
        });
        return this.success(user!, { preferred_username: user!.email });
    }
}

export const getStrategy = () => {
    const strategy = new MockStrat();
    return strategy;
};