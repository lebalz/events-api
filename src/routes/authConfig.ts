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

/**
 * Routes that are accessible without authentication
 * only for GET requests
 */
export const PUBLIC_ROUTES = [
    '/events',
    '/events/:id',
    '/departments',
    '/semesters',
    '/untis/classes',
];

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
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        user: {
            path: '/user',
            access: [{
                methods: ['GET', 'POST'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        users: {
            path: '/users',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userEvents: {
            path: '/user/events',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userFind: {
            path: '/users/:id',
            access: [{
                methods: ['GET', 'PUT'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userLinkToUntis: {
            path: '/users/:id/link_to_untis',
            access: [{
                methods: ['PUT'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userSetRole: {
            path: '/users/:id/set_role',
            access: [{
                methods: ['PUT'],
                roles: [Role.ADMIN],
            }]
        },
        userIcs: {
            path: '/users/:id/create_ics',
            access: [{
                methods: ['POST'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userAffectedEventIds: {
            path: '/users/:id/affected-event-ids',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        event: {
            path: '/events',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.USER],
                },
                {
                    methods: ['POST', 'PUT', 'DELETE'],
                    roles: [Role.ADMIN, Role.USER],
                }
            ]
        },
        eventImport: {
            path: '/events/import',
            access: [{
                methods: ['POST'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        userEventGroup: {
            path: '/event_groups',
            access: [{
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                roles: [Role.USER, Role.ADMIN],
            }]
        },
        untis: {
            path: '/untis',
            access: [
                {
                    methods: ['GET'],
                    roles: [Role.ADMIN, Role.USER],
                },
                {
                    methods: ['GET', 'POST'],
                    roles: [Role.ADMIN],
                }
            ]
        },
        untisSync: {
            path: '/untis/sync',
            access: [
                {
                    methods: ['POST'],
                    roles: [Role.ADMIN],
                }
            ]
        },
        job: {
            path: '/jobs',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        findJob: {
            path: '/jobs/:id',
            access: [{
                methods: ['GET', 'PUT', 'DELETE'],
                roles: [Role.ADMIN, Role.USER],
            }]
        },
        department: {
            path: '/departments',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }, {
                methods: ['GET', 'PUT', 'POST', 'DELETE'],
                roles: [Role.ADMIN],
            }]
        },
        semester: {
            path: '/semesters',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }, {
                methods: ['GET', 'PUT', 'POST', 'DELETE'],
                roles: [Role.ADMIN],
            }]
        },
        registrationPeriods: {
            path: '/registration_periods',
            access: [{
                methods: ['GET'],
                roles: [Role.ADMIN, Role.USER],
            }, {
                methods: ['PUT', 'DELETE', 'POST'],
                roles: [Role.ADMIN],
            }]
        }
    },
};

export default authConfig;