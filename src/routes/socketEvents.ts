/* istanbul ignore file */

import type { User } from '@prisma/client';
import { Server } from 'socket.io';
import { affectedLessons } from '../services/eventChecker';
import { affectedLessons as checkUnpersisted } from '../services/eventCheckUnpersisted';
import Logger from '../utils/logger';
import { ClientToServerEvents, IoEvents, ServerToClientEvents } from './socketEventTypes';

export enum IoRoom {
    ADMIN = 'admin',
    ALL = 'all'
}

const EventRouter = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', (socket) => {
        const user = (socket.request as { user?: User }).user;
        if (!user) {
            return socket.disconnect();
        }
        const sid = (socket.request as { sessionID?: string }).sessionID;
        if (sid) {
            socket.join(sid);
        }
        if (user.role === 'ADMIN') {
            socket.join(IoRoom.ADMIN);
        }
        socket.join(IoRoom.ALL);

        socket.join(user.id);

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
                callback({ state: 'success', lessons: result });
            } catch (error) /* istanbul ignore next */ {
                Logger.error(error);
                callback({ state: 'error', message: (error as Error).message });
            }
        });
    });

    io.on('disconnect', (socket) => {
        const { user } = socket.request as { user?: User };
        /* istanbul ignore next */
        Logger.info('Socket.io disconnect');
    });

    io.on('error', (socket) => {
        /* istanbul ignore next */
        Logger.error(`Socket.io error`);
    });

    io.on('reconnect', (socket) => {
        const { user } = socket.request as { user?: User };
        /* istanbul ignore next */
        Logger.info('Socket.io reconnect');
    });
};

export default EventRouter;
