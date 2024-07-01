import app, { configure, sessionMiddleware } from './app';
import http from 'http';
import Logger from './utils/logger';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import passport from 'passport';
import EventRouter from './routes/socketEvents';
import { NextFunction, Request, Response } from 'express';
import Bree from 'bree';
import path from 'path';
import { ClientToServerEvents, ServerToClientEvents } from './routes/socketEventTypes';

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);
const corsOrigin = process.env.EVENTS_APP_URL
    ? [process.env.EVENTS_APP_URL, 'https://admin.socket.io']
    : true;

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    transports: ['websocket' /* , 'polling' */]
});

instrument(io, {
    readonly: false,
    namespaceName: '/sio-admin',
    mode: 'development',
    auth: process.env.ADMIN_UI_PASSWORD
        ? {
              type: 'basic',
              username: 'admin',
              /* generate a bcrypt hashed pw, e.g. with https://bcrypt.online/ */
              password: process.env.ADMIN_UI_PASSWORD
          }
        : false
});

// convert a connect middleware to a Socket.IO middleware
io.use((socket, next) => {
    sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
});
io.use((socket, next) => {
    passport.initialize()(socket.request as Request, {} as Response, next as NextFunction);
});
io.use((socket, next) => {
    passport.session()(socket.request as Request, {} as Response, next as NextFunction);
});

EventRouter(io);

// only allow authenticated users in socketio
io.use((socket, next) => {
    if ((socket.request as any).user) {
        next();
    } else {
        next(new Error('unauthorized'));
    }
});

// Make io accessible to our router
app.use((req: Request, res, next) => {
    req.io = io;
    next();
});

configure(app);

server.listen(PORT || 3002, () => {
    Logger.info(`application is running at: http://localhost:${PORT}`);
    Logger.info('Press Ctrl+C to quit.');
});

if (process.env.NODE_ENV === 'production' || process.env.BREE) {
    const bree = new Bree({
        logger: Logger,
        root: path.join(__dirname, 'jobs'),
        jobs: [
            {
                name: 'sync-ics',
                timeout: '10 secondes',
                interval: 'every 6 hours'
            }
        ],
        /**
         * We only need the default extension to be "ts"
         * when we are running the app with ts-node - otherwise
         * the compiled-to-js code still needs to use JS
         */
        defaultExtension: process.env.TS_NODE ? 'ts' : 'js'
    });

    bree.on('worker created', (name) => {
        console.log('worker created', name);
    });

    bree.on('worker deleted', (name) => {
        console.log('worker deleted', name);
    });

    bree.start();
} else if (process.env.NODE_ENV !== 'test') {
    Logger.info(`
┌─────────────────────────────────────────────────────────────────┐
│  Bree not started in development mode (env BREE=1 was not set)  │
└─────────────────────────────────────────────────────────────────┘
    `);
}
