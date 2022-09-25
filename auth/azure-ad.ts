import { BearerStrategy, IBearerStrategyOptionWithRequest, VerifyBearerFunction } from 'passport-azure-ad';
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

const BearerVerify: VerifyBearerFunction = (token, done) => {
    // Send user info using the second argument
    done(null, {}, token);
};

export const getStrategy = () => {
    const strategy = new BearerStrategy(options, BearerVerify);
    return strategy;
};
