import { strategyForEnvironment } from "./auth/index";
import express, { Request } from "express";
import session from 'express-session';
import compression from "compression";
import prisma from "./prisma";
import path from "path";
import cors from "cors";
import morganMiddleware from './middlewares/morgan.middleware'
import passport from "passport";
import router from './routes/router';
import routeGuard, { PUBLIC_GET_ACCESS, PUBLIC_GET_ACCESS_REGEX, PUBLIC_POST_ACCESS, PUBLIC_POST_ACCESS_REGEX, createAccessRules } from './auth/guard';
import authConfig, { PUBLIC_POST_ROUTES, PUBLIC_ROUTES } from './routes/authConfig';
import type { User } from "@prisma/client";
import { HttpStatusCode } from "./utils/errors/BaseError";
import { notify } from "./middlewares/notify.nop";
import { HTTP401Error } from "./utils/errors/Errors";
import connectPgSimple from "connect-pg-simple";

const AccessRules = createAccessRules(authConfig.accessMatrix);


/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 * 
 */

const app = express();
export const API_VERSION = 'v1';
export const API_URL = `/api/${API_VERSION}`;
const ICAL_DEFAULT = process.env.EXPORT_DIR || `${__dirname}/../../ical`;
const ICAL_DEFAULT_DIRS = {
    'test': `${__dirname}/../tests/test-data/ical`,
    'development': ICAL_DEFAULT,
    'production': ICAL_DEFAULT,
}
export const ICAL_DIR = ICAL_DEFAULT_DIRS[process.env.NODE_ENV as keyof typeof ICAL_DEFAULT_DIRS] || ICAL_DEFAULT;


app.use(compression(), express.json({ limit: "5mb" }));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(cors({
    credentials: true,
    origin: process.env.EVENTS_APP_URL || true, /* true = strict origin */
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
}));

// received packages should be presented in the JSON format
app.use(express.json());

app.use(morganMiddleware);

const store = new (connectPgSimple(session))({
    conString: process.env.DATABASE_URL
});

const subdomain = process.env.EVENTS_APP_URL ? new URL(process.env.EVENTS_APP_URL).hostname : '';
const subdomainParts = subdomain.split('.');
const domain = subdomainParts.slice(subdomainParts.length - 2).join('.');

export const sessionMiddleware = session({
    name: 'events-api-session',
    store: store,
    secret: process.env.SESSION_SECRET || 'secret',
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: false, // process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      domain: domain.length > 0 ? domain : undefined,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  });

app.use(sessionMiddleware);

// export const sessionMiddleware = session({
//     secret: process.env.SESSION_SECRET || 'secret',
//     resave: false,
//     saveUninitialized: false /** TODO: check if false is ok */
// });

// app.use(sessionMiddleware)


app.use(passport.initialize());
app.use(passport.session()); /** alias for passport.authenticate('session'); e.g. to use the session... */

passport.use(strategyForEnvironment());

passport.serializeUser((user, done) => {
    /** ignore this socket */
    done(null, user.id);
})


/** ignore this socket */
passport.deserializeUser(async (id, done) => {
    const user = await prisma.user.findUnique({ where: { id: id as string } });
    done(null, user);
});

/** Static folders */
app.use('/ical', express.static(ICAL_DIR));
// Serve the static files to be accessed by the docs app
app.use(express.static(path.join(__dirname,'..', 'docs')));

// Public Endpoints
app.get(`${API_URL}`, (req, res) => {
    return res.status(200).send("Welcome to the EVENTES-API V1.0");
});

app.get(`${API_URL}/checklogin`,
    passport.authenticate("oauth-bearer", { session: true }),
    async (req, res, next) => {
        try {
            if (req.user) {
                return res.status(200).send('OK');
            }
            throw new HTTP401Error();
        } catch /* istanbul ignore next */ (error) {
            next(error);
        }
    }
);
export const configure = (_app: typeof app) => {
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
            const io = req.io;
    
            /* istanbul ignore next */
            if (res.notifications && io) {
                res.notifications.forEach((notification) => {
                    const except: string[] = [];
                    /** ignore this socket */
                    if (!notification.toSelf) {
                        const socketID = req.headers['x-metadata-socketid'] as string;
                        if (socketID) {
                            except.push(socketID);
                        }
                    }
                    io.except(except)
                        .to(notification.to)
                        .emit(
                            notification.event, 
                            JSON.stringify(notification.message)
                        );
                });
            }
            res.locals.notifications = res.notifications;
        });
        next();
    });
    
    if (process.env.NODE_ENV === 'test') {
        _app.use((req: Request, res, next) => {
            res.on('finish', async () => {
                if (res.statusCode >= 400) {
                    return;
                }    
                if (res.notifications) {
                    res.notifications.forEach((notification) => {
                        notify(notification);
                    });
                }
                res.locals.notifications = res.notifications;
            });
            next();
        });
    }
    
    
    _app.use(`${API_URL}`, (req, res, next) => {
        passport.authenticate('oauth-bearer', { session: true }, (err: Error, user: User, info: any) => {
            if (err) {
                /**
                 * An error occurred during authorization. Send a Not Autohrized 
                 * status code.
                 */
                /* istanbul ignore next */
                return res.status(HttpStatusCode.UNAUTHORIZED).json({ error: err.message });
            }
    
            if (!user && !(
                            PUBLIC_GET_ACCESS.has(req.path.toLowerCase()) ||
                            PUBLIC_POST_ACCESS.has(req.path.toLowerCase()) ||
                            PUBLIC_GET_ACCESS_REGEX.some((regex) => regex.test(req.path)) ||
                            PUBLIC_POST_ACCESS_REGEX.some((regex) => regex.test(req.path))
                        )) {
                // If no user object found, send a 401 response.
                return res.status(HttpStatusCode.UNAUTHORIZED).json({ error: 'Unauthorized' });
            }
            req.user = user;
            if (info) {
                // access token payload will be available in req.authInfo downstream
                req.authInfo = info;
                return next();
            }
        })(req, res, next);
    },
        routeGuard(AccessRules), // route guard middleware
        router // the router with all the routes
    );
}

if (process.env.NODE_ENV === 'test') {
    configure(app);
}




export default app;