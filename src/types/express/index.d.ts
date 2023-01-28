import { User as pUser } from '@prisma/client';
import { Server } from "socket.io";
import { Notification } from '../../routes/IoEventTypes';


// to make the file a module and avoid the TypeScript error
export {}

declare global {
  namespace Express {
    export interface User extends pUser {
    }
    export interface Request {        
      io?: Server;
    }

    export interface Response {
      notifications?: Notification[];
    }
  }
}