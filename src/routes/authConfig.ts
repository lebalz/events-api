import { Role } from 'src/models/user.js';

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
    validateIssuer: boolean;
    passReqToCallback: boolean;
    loggingLevel: string;
}
export interface AccessMatrix {
    [key: string]: {
        path: string;
        access: { methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[]; minRole: Role }[];
    };
}

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
export const PUBLIC_ROUTES = ['/events', '/events/:id', '/departments', '/semesters', '/untis/classes'];

const authConfig: Config = {
    credentials: {
        tenantID: process.env.TENANT_ID || '',
        clientID: process.env.CLIENT_ID || ''
    },
    metadata: {
        authority: 'login.microsoftonline.com',
        discovery: '.well-known/openid-configuration',
        version: 'v2.0'
    },
    settings: {
        validateIssuer: true,
        passReqToCallback: false,
        loggingLevel: 'warn'
    },
    accessMatrix: {
        user: {
            path: '/user',
            access: [
                {
                    methods: ['GET', 'POST'],
                    minRole: Role.USER
                }
            ]
        },
        users: {
            path: '/users',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                }
            ]
        },
        userEvents: {
            path: '/user/events',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                }
            ]
        },
        userFind: {
            path: '/users/:id',
            access: [
                {
                    methods: ['GET', 'PUT'],
                    minRole: Role.USER
                }
            ]
        },
        userLinkToUntis: {
            path: '/users/:id/link_to_untis',
            access: [
                {
                    methods: ['PUT'],
                    minRole: Role.USER
                }
            ]
        },
        userSetRole: {
            path: '/users/:id/set_role',
            access: [
                {
                    methods: ['PUT'],
                    minRole: Role.ADMIN
                }
            ]
        },
        userIcs: {
            path: '/users/:id/create_ics',
            access: [
                {
                    methods: ['POST'],
                    minRole: Role.USER
                }
            ]
        },
        userAffectedEventIds: {
            path: '/users/:id/affected-event-ids',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                }
            ]
        },
        normalizeAudience: {
            path: '/users/:id/normalize_audience',
            access: [
                {
                    methods: ['POST'],
                    minRole: Role.USER
                }
            ]
        },
        event: {
            path: '/events',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                },
                {
                    methods: ['POST', 'PUT', 'DELETE'],
                    minRole: Role.USER
                }
            ]
        },
        eventImport: {
            path: '/events/import',
            access: [
                {
                    methods: ['POST'],
                    minRole: Role.USER
                }
            ]
        },
        userEventGroup: {
            path: '/event_groups',
            access: [
                {
                    methods: ['GET', 'POST', 'PUT', 'DELETE'],
                    minRole: Role.USER
                }
            ]
        },
        untis: {
            path: '/untis',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                },
                {
                    methods: ['GET', 'POST'],
                    minRole: Role.ADMIN
                }
            ]
        },
        untisSync: {
            path: '/untis/sync',
            access: [
                {
                    methods: ['POST'],
                    minRole: Role.ADMIN
                }
            ]
        },
        job: {
            path: '/jobs',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                }
            ]
        },
        findJob: {
            path: '/jobs/:id',
            access: [
                {
                    methods: ['GET', 'PUT', 'DELETE'],
                    minRole: Role.USER
                }
            ]
        },
        department: {
            path: '/departments',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                },
                {
                    methods: ['GET', 'PUT', 'POST', 'DELETE'],
                    minRole: Role.ADMIN
                }
            ]
        },
        semester: {
            path: '/semesters',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                },
                {
                    methods: ['GET', 'PUT', 'POST', 'DELETE'],
                    minRole: Role.ADMIN
                }
            ]
        },
        registrationPeriods: {
            path: '/registration_periods',
            access: [
                {
                    methods: ['GET'],
                    minRole: Role.USER
                },
                {
                    methods: ['PUT', 'DELETE', 'POST'],
                    minRole: Role.ADMIN
                }
            ]
        },
        subscription: {
            path: '/subscriptions',
            access: [
                {
                    methods: ['PUT', 'POST'],
                    minRole: Role.USER
                }
            ]
        }
    }
};

export default authConfig;
