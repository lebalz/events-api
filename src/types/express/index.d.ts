import type { User as pUser } from 'prisma/generated/client.js';
import { Server } from 'socket.io';
import {
    ClientToServerEvents,
    IoEvent,
    Notification,
    ServerToClientEvents
} from '../../routes/socketEventTypes.js';

// to make the file a module and avoid the TypeScript error
export { };

declare global {
    namespace Express {
        export interface User extends pUser { }
        export interface Request {
            io?: Server<ClientToServerEvents, ServerToClientEvents>;
        }

        export interface Response {
            notifications?: Notification[];
        }
    }
}
