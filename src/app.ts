import { strategyForEnvironment } from "./auth/index";
import express, { Request, Response, NextFunction } from "express";
import session from 'express-session';
import compression from "compression";
import prisma from "./prisma";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";
import { Server } from "socket.io";
import http from 'http';
import router from './routes/router';
import routeGuard, { createAccessRules } from './auth/guard';
import authConfig from './routes/authConfig';
import EventRouter from './routes/socketEvents';
import {instrument} from '@socket.io/admin-ui';

const AccessRules = createAccessRules(authConfig.accessMatrix);


/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 * 
 */

const PORT = process.env.PORT || 3002;

interface ErrorResponse {
    message: string,
    error: any
}

const app = express();
const server = http.createServer(app);

app.use(compression(), express.json({ limit: "5mb" }));
// Serve the static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN || true, /* true = strict origin */
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// received packages should be presented in the JSON format
app.use(express.json());

// show some helpful logs in the commandline
app.use(morgan("combined"));

const sessionMiddleware = session({
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

// Public Endpoints
app.get("/api/v1", (req, res) => {
    return res.status(200).send("Welcome to the EVENTES-API V1.0");
});

app.get('/api/v1/checklogin',
    passport.authenticate("oauth-bearer", { session: true }),
    async (req, res) => {
        res.status(req.user ? 200 : 401).send('OK')
    }
);


const corsOrigin = process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN, 'https://admin.socket.io'] : true;

const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
    transports: ['websocket'/* , 'polling' */]
});


instrument(io, {
    readonly: true,
    auth: process.env.ADMIN_UI_PASSWORD ? {
        type: 'basic',
        username: 'admin',
        /* generate a bcrypt hashed pw, e.g. with https://bcrypt.online/ */
        password: process.env.ADMIN_UI_PASSWORD
    } : false,
});


// convert a connect middleware to a Socket.IO middleware
io.use((socket, next) => {
    sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
});
io.use((socket, next) => {
    passport.initialize()(socket.request as Request, {} as Response, next as NextFunction)
});
io.use((socket, next) => {
    passport.session()(socket.request as Request, {} as Response, next as NextFunction)
});

EventRouter(io);

// only allow authenticated users
io.use((socket, next) => {
    if ((socket.request as any).user) {
        next();
    } else {
        next(new Error("unauthorized"));
    }
});

// Make io accessible to our router
app.use((req: Request, res, next) => {
    req.io = io;
    next();
});

/**
 * Notification Middleware
 * when the response `res` contains a `notifications` property, the middleware will
 * send the notification over SocketIO to the specififed rooms.
 */
app.use((req: Request, res, next) => {
    res.on('finish', async () => {
        console.log('user', req.user?.id, '->', req.sessionID);
        const io = req.io;
        if (res.notifications && io) {
            res.notifications.forEach((notification) => {
                const except: string[] = [];
                if (!notification.toSelf) {
                    const socketID = req.headers['x-metadata-socketid'] as string;
                    console.log('socketID', socketID);
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
    });
    next();
});


app.use('/api/v1', (req, res, next) => {
    passport.authenticate('oauth-bearer', { session: true }, (err, user, info) => {
        if (err) {
            /**
             * An error occurred during authorization. Send a Not Autohrized 
             * status code.
             */
            return res.status(401).json({ error: err.message });
        }

        if (!user) {
            // If no user object found, send a 401 response.
            return res.status(401).json({ error: 'Unauthorized' });
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


server.listen(PORT || 3002, () => {
    console.log(`application is running at: http://localhost:${PORT}`);
});
