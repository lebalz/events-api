import { Role } from "@prisma/client";

interface Credentials {
    tenantID: string;
    clientID: string;
}
interface Metadata {
    authority: string;
    discovery: string;
    version: string;
}
interface Settings {
    validateIssuer: boolean,
    passReqToCallback: boolean,
    loggingLevel: string;
}
export interface AccessMatrix {
    [key: string]: {
        path: string;
        access: {
            methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
            roles: Role[]
        }[]
    }
};

interface Config {
    credentials: Credentials;
    metadata: Metadata;
    settings: Settings;
    accessMatrix: AccessMatrix;
}

const authConfig: Config = {
    credentials: {
        tenantID: process.env.TENANT_ID || '',
        clientID: process.env.CLIENT_ID || '',
    },
    metadata: {
        authority: 'login.microsoftonline.com',
        discovery: '.well-known/openid-configuration',
        version: 'v2.0',
    },
    settings: {
        validateIssuer: true,
        passReqToCallback: false,
        loggingLevel: 'warn'
    },
    accessMatrix: {
        checklogin: {
            path: '/checklogin',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER, Role.STUDENT],
            }]
        },
        user: {
            path: '/user',
            access: [{
                methods: ['GET', 'POST'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userFind: {
            path: '/user/:id',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userAll: {
            path: '/user/all',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER, Role.STUDENT],
            }]
        },
        userLinkToUntis: {
            path: '/user/:id/link_to_untis',
            access: [{
                methods: ['PUT'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        event: {
            path: '/event',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.USER, Role.STUDENT],
                },
                {
                    methods: ['POST', 'PUT', 'DELETE'],
                    roles: [Role.ADMIN, Role.USER],
                }
            ]
        },
        eventAll: {
            path: '/event/all',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER, Role.STUDENT],
            }]
        },
        eventImport: {
            path: '/event/import',
            access: [{
                methods: ['POST'],
                roles: [Role.ADMIN],
            }]
        },
        untis: {
            path: '/untis',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.USER, Role.STUDENT],
                },
                {
                    methods: ['GET', 'POST'],
                    roles: [Role.ADMIN],
                }
            ]
        },
        untisTeacher: {
            path: '/untis/teacher',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.USER],
                }
            ]
        },
        findJob: {
            path: '/job/:id',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER, Role.STUDENT],
            },
            {
                methods: ['GET', 'POST', 'DELETE'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        allJobs: {
            path: '/job/all',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER, Role.STUDENT],
            }]
        }
    },
};

export default authConfig;