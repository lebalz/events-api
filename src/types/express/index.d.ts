import { Notification } from 'src/routes/socketEventTypes.ts';
import type { User as pUser } from 'src/prisma/generated/client.js';
// to make the file a module and avoid the TypeScript error
export { };

declare global {
    namespace Express {
        export interface Request {
            user: pUser;
        }

        export interface Response {
            notifications?: Notification[];
        }
    }
}
