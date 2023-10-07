import type { Event, User } from "@prisma/client";
import { Server } from "socket.io";
import { checkEvent } from "../services/eventChecker";
import { checkEvent as checkUnpersisted } from "../services/eventCheckUnpersisted";
import Logger from "../utils/logger";

export enum IoRoom {
    ADMIN = 'admin',
    ALL = 'all'
}

const EventRouter = (io: Server) => {
    io.on("connection", (socket) => {
        const { user } = (socket.request as { user?: User });
        if (!user) {
            return socket.disconnect();
        }
        const sid = (socket.request as any).sessionID;
        if (sid) {
            socket.join(sid);
        }
        if (user.role === 'ADMIN') {
            socket.join(IoRoom.ADMIN);
        }
        socket.join(IoRoom.ALL);

        socket.join(user.id);

        socket.on('checkEvent', async ({ event_id }: { event_id: string }) => {
            try {
                const result = await checkEvent(event_id, user.id);
                socket.emit('checkEvent', { state: 'success', result });
            } catch (error) /* istanbul ignore next */ {
                /* istanbul ignore next */
                Logger.error(error);
                socket.emit('checkEvent', { state: 'error', result: {} });
            }
        })
        socket.on('checkUnpersistedEvent', async ({ event }: { event: Event }) => {
            try {
                const result = await checkUnpersisted(event, user.id);
                socket.emit('checkEvent', { state: 'success', result });
            } catch (error) /* istanbul ignore next */ {
                /* istanbul ignore next */
                Logger.error(error);
                socket.emit('checkEvent', { state: 'error', result: {} });
            }
        })
    });

    io.on('disconnect', (socket) => {
        const { user } = (socket.request as { user?: User });
        /* istanbul ignore next */
        Logger.info('Socket.io disconnect');
    });

    io.on('error', (socket) => {
        /* istanbul ignore next */
        Logger.error(`Socket.io error`);
    })

    io.on('reconnect', (socket) => {
        const { user } = (socket.request as { user?: User });
        /* istanbul ignore next */
        Logger.info('Socket.io reconnect');
    })
}

export default EventRouter;