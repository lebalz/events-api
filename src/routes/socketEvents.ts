/* istanbul ignore file */

import type { User } from 'prisma/generated/client.js';
import { Server } from 'socket.io';
import { affectedLessons } from '../services/eventChecker.js';
import { affectedLessons as checkUnpersisted } from '../services/eventCheckUnpersisted.js';
import Logger from '../utils/logger.js';
import { ClientToServerEvents, IoEvents, ServerToClientEvents } from './socketEventTypes.js';
import { auth } from '../auth.js';
import { Role } from 'src/models/user.js';

export enum IoRoom {
    ADMIN = 'admin',
    ALL = 'all'
}

const EventRouter = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', async (socket) => {
        const token = socket.handshake.auth.token;
        const session = await auth.api.verifyOneTimeToken({ body: { token } }).catch(() => null);

        if (!session?.user) {
            return socket.disconnect();
        }
        const user = session.user as User;
        if (!user) {
            return socket.disconnect();
        }
        socket.join(user.id);

        if (user.role === Role.ADMIN) {
            socket.join(IoRoom.ADMIN);
        }
        socket.join(IoRoom.ALL);

        socket.on(IoEvents.AffectedLessons, async (eventId, semesterId, callback) => {
            try {
                const result = await affectedLessons(eventId, semesterId);
                callback({ state: 'success', lessons: result });
            } catch (e) /* istanbul ignore next */ {
                Logger.error(e);
                callback({ state: 'error', message: (e as Error).message });
            }
        });
        socket.on(IoEvents.AffectedLessonsTmp, async (event, semesterId, callback) => {
            try {
                const result = await checkUnpersisted(user.id, event, semesterId);
                callback({ state: 'success', lessons: result ?? [] });
            } catch (error) /* istanbul ignore next */ {
                Logger.error(error);
                callback({ state: 'error', message: (error as Error).message });
            }
        });
    });

    io.on('disconnect', (socket) => {
        Logger.info(`Socket.io disconnect ${socket.id}`);
    });

    io.on('error', (socket) => {
        Logger.error(`Socket.io error ${socket.id}`);
    });

    io.on('reconnect', (socket) => {
        Logger.info(`Socket.io reconnect ${socket.id}`);
    });
};

export default EventRouter;
