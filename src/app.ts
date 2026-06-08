import express, { NextFunction, Request, Response } from 'express';
import prisma from 'src/prisma.js';
import path from 'path';
import cors from 'cors';
import morganMiddleware from './middlewares/morgan.middleware.js';
import router from './routes/router.js';
import routeGuard, { PUBLIC_GET_ACCESS, PUBLIC_GET_ACCESS_REGEX, createAccessRules } from './auth/guard.js';
import authConfig from './routes/authConfig.js';
import type { User } from 'prisma/generated/client.js';
import BaseError from './utils/errors/BaseError.js';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';

import Logger from './utils/logger.js';
import { CORS_ORIGIN } from './utils/originConfig.js';
import { notify } from './socketIoServer.js';
import { notify as nopNotify } from './middlewares/notify.nop.js';

import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ICAL_DIR, STATIC_DIR } from './utils/icalConfig.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AccessRules = createAccessRules(authConfig.accessMatrix);

/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 *
 */

const app = express();
export const API_VERSION = 'v1';
export const API_URL = `/api/${API_VERSION}`;

if (!existsSync(`${STATIC_DIR}/de`)) {
    mkdirSync(`${STATIC_DIR}/de`, { recursive: true });
}
if (!existsSync(`${STATIC_DIR}/fr`)) {
    mkdirSync(`${STATIC_DIR}/fr`, { recursive: true });
}

/**
 *  this is not needed when running behind a reverse proxy
 *  as is the case with dokku (nginx)
 */
//  app.use(compression(), express.json({ limit: "5mb" }));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(
    cors({
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
        origin: CORS_ORIGIN,
        credentials: true
    })
);

/** make sure to have 1 (reverse) proxy in front of the application
 * as is the case with dokku (nginx)
 */
app.set('trust proxy', 1);
app.use(morganMiddleware);

// make sure to configure *before* the json middleware
app.all('/api/auth/{*any}', toNodeHandler(auth));

// received packages should be presented in the JSON format
app.use(express.json({ limit: '15mb' }));

/** Static folders */
app.use(
    '/ical',
    (req, res, next) => {
        if (req.path.endsWith('.ics')) {
            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        }
        next();
    },
    express.static(ICAL_DIR)
);

// Serve the static files to be accessed by the docs app
app.use(express.static(path.join(__dirname, '..', 'docs')));

const welcomeApi = (req: Request, res: Response) => {
    return res.status(200).send('Welcome to the EVENTS-API V1.0');
};

const getTestUser = async (req: Request) => {
    if (process.env.NODE_ENV !== 'test') {
        return null;
    }

    const authorization = req.headers.authorization;
    if (!authorization) {
        return null;
    }

    try {
        const authHeader = JSON.parse(authorization) as { email?: string; noAuth?: boolean };
        if (authHeader.noAuth || !authHeader.email) {
            return null;
        }

        return prisma.user.findFirst({
            where: {
                OR: [{ email: authHeader.email }, { email: authHeader.email.toLowerCase() }]
            }
        });
    } catch {
        return null;
    }
};

// Public Endpoints
app.get(`${API_URL}`, welcomeApi);

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if ((err as BaseError).isHttpError) {
        const httpErr = err as BaseError;
        res.status(httpErr.statusCode).send({
            errors: [
                {
                    name: httpErr.name,
                    message: httpErr.message,
                    status: httpErr.statusCode,
                    isOperational: httpErr.isOperational
                }
            ]
        });
    } else {
        res.status(500).send({ errors: [{ name: err.name, message: err.message }] });
    }
    Logger.error(err);
};

export const configure = (_app: typeof app) => {
    const sendNotification = process.env.NODE_ENV === 'test' ? nopNotify : notify;

    /**
     * Notification Middleware
     * when the response `res` contains a `notifications` property, the middleware will
     * send the notification over SocketIO to the specififed rooms.
     */
    _app.use((req: Request, res, next) => {
        res.on('finish', async () => {
            if (res.statusCode >= 400) {
                return;
            }

            /* istanbul ignore next */
            if (res.notifications) {
                res.notifications.forEach((notification) => {
                    if (sendNotification === notify) {
                        sendNotification(notification, req.headers['x-metadata-sid'] as string);
                        return;
                    }
                    sendNotification(notification);
                });
            }
        });
        next();
    });

    /**
     * API Route Guard
     * This middleware will check if the user is authenticated and has the required
     * permissions to access the requested route.
     */
    _app.use(
        `${API_URL}`,
        async (req, res, next) => {
            const reqPath = req.path.toLowerCase();
            const isPublicGet =
                req.method === 'GET' &&
                (PUBLIC_GET_ACCESS.has(reqPath) ||
                    PUBLIC_GET_ACCESS_REGEX.some((regex) => regex.test(reqPath)));

            const testUser = await getTestUser(req);
            if (testUser) {
                req.user = testUser as User;
                return next();
            }

            return auth.api
                .getSession({ headers: fromNodeHeaders(req.headers) })
                .then((session) => {
                    if (!session?.user) {
                        if (isPublicGet) {
                            return next();
                        }
                        return res.status(401).json({ error: 'Unauthorized' });
                    }
                    req.user = session.user as User;
                    return next();
                })
                .catch((err) => {
                    if (isPublicGet) {
                        return next();
                    }
                    return res.status(401).json({ error: err.message });
                });
        },
        routeGuard(AccessRules), // route guard middleware
        router // the router with all the routes
    );
    _app.use(errorHandler);
};

if (process.env.NODE_ENV === 'test') {
    configure(app);
}

export default app;
