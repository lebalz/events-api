import prisma from '../src/prisma';
import { BearerStrategy, IBearerStrategyOptionWithRequest, VerifyBearerFunction } from 'passport-azure-ad';
import { getAuthInfo, userProps } from '../src/helpers';
// Set the Azure AD B2C options
const auth = {
    tenantID: process.env.TENANT_ID,
    clientID: process.env.CLIENT_ID,
    audience: process.env.CLIENT_ID,
    authority: 'login.microsoftonline.com',
    version: 'v2.0',
    discovery: '.well-known/openid-configuration',
    scope: ['access_as_user'],
    validateIssuer: true,
    passReqToCallback: false,
    loggingLevel: 'info',
};

const options: IBearerStrategyOptionWithRequest = {
    identityMetadata: `https://${auth.authority}/${auth.tenantID}/${auth.version}/${auth.discovery}`,
    issuer: `https://${auth.authority}/${auth.tenantID}/${auth.version}`,
    clientID: auth.clientID || '',
    audience: auth.audience,
    validateIssuer: auth.validateIssuer,
    passReqToCallback: auth.passReqToCallback,
    loggingLevel: auth.loggingLevel as 'info' | 'warn' | 'error' | undefined,
    scope: auth.scope,
};

const BearerVerify: VerifyBearerFunction = async (token, done) => {
    const { oid } = getAuthInfo(token);
    // @link https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5
    const user = await prisma.user.upsert({
        where: { id: oid },
        update: userProps(token, false),
        create: userProps(token, true)
    }).catch((err) => {
        console.log(err);
        return false;
    });
    // Send user info using the second argument
    done(null, user, token);
};

export const getStrategy = () => {
    const strategy = new BearerStrategy(options, BearerVerify);
    return strategy;
};
