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
import routeGuard, { createAccessRules } from './auth/guard';
import authConfig, { PUBLIC_POST_ROUTES, PUBLIC_ROUTES } from './routes/authConfig';
import type { User } from "@prisma/client";
import { HttpStatusCode } from "./utils/errors/BaseError";
import { notify } from "./middlewares/notify.nop";

const AccessRules = createAccessRules(authConfig.accessMatrix);


/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 * 
 */

const app = express();
export const API_VERSION = 'v1';
export const API_URL = `/api/${API_VERSION}`;

app.use(compression(), express.json({ limit: "5mb" }));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(cors({
    credentials: true,
    origin: process.env.EVENTS_APP_URL || true, /* true = strict origin */
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// received packages should be presented in the JSON format
app.use(express.json());

app.use(morganMiddleware);

export const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false /** TODO: check if false is ok */
});

app.use(sessionMiddleware)


app.use(passport.initialize());
app.use(passport.session());

passport.use(strategyForEnvironment());

passport.serializeUser((user, done) => {
    done(null, user.id)
})


passport.deserializeUser(async (id, done) => {
    const user = await prisma.user.findUnique({ where: { id: id as string } })
    done(null, user)
});

/** Static folders */
app.use('/ical', express.static(path.join(__dirname, '..', 'ical')));
// Serve the static files from the React app
app.use(express.static(path.join(__dirname,'..', 'docs')));

// Public Endpoints
app.get(`${API_URL}`, (req, res) => {
    return res.status(200).send("Welcome to the EVENTES-API V1.0");
});

app.get(`${API_URL}/checklogin`,
    passport.authenticate("oauth-bearer", { session: true }),
    async (req, res) => {
        res.status(req.user ? 200 : 401).send('OK')
    }
);




/**
 * Notification Middleware
 * when the response `res` contains a `notifications` property, the middleware will
 * send the notification over SocketIO to the specififed rooms.
 */
app.use((req: Request, res, next) => {
    res.on('finish', async () => {
        if (res.statusCode >= 400) {
            return;
        }
        const io = req.io;
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
                if (notification.to) {
                    io.except(except).to(notification.to).emit(notification.event, JSON.stringify(notification.message));
                } else {
                    io.except(except).emit(notification.event, JSON.stringify(notification.message));
                }
            });
        }
        res.locals.notifications = res.notifications;
    });
    next();
});

if (process.env.NODE_ENV === 'test') {
    app.use((req: Request, res, next) => {
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


app.use(`${API_URL}`, (req, res, next) => {
    passport.authenticate('oauth-bearer', { session: true }, (err: Error, user: User, info: any) => {
        if (err) {
            /**
             * An error occurred during authorization. Send a Not Autohrized 
             * status code.
             */
            return res.status(HttpStatusCode.UNAUTHORIZED).json({ error: err.message });
        }

        if (!user && ![...PUBLIC_ROUTES, ...PUBLIC_POST_ROUTES].includes(req.path.toLowerCase())) {
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


export default app;