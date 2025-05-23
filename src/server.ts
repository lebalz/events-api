import app, { configure, sessionMiddleware } from './app';
import http from 'http';
import Logger from './utils/logger';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import passport from 'passport';
import EventRouter from './routes/socketEvents';
import { NextFunction, Request, Response } from 'express';
import { ClientToServerEvents, ServerToClientEvents } from './routes/socketEventTypes';
import * as Sentry from '@sentry/node';

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);

const corsOrigin = process.env.WITH_DEPLOY_PREVIEW
    ? [
          process.env.EVENTS_APP_URL || true,
          'https://admin.socket.io',
          /https:\/\/deploy-preview-\d+--gbsl-events-app.netlify.app/
      ]
    : [process.env.EVENTS_APP_URL || true, 'https://admin.socket.io']; /* true = strict origin */

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

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.1,
        integrations: [Sentry.prismaIntegration()]
    });
}

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
if (process.env.NODE_ENV === 'production') {
    Sentry.setupExpressErrorHandler(app);
}
server.listen(PORT || 3002, () => {
    Logger.info(`application is running at: http://localhost:${PORT}`);
    Logger.info('Press Ctrl+C to quit.');
});
