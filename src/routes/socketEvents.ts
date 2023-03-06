import { User } from "@prisma/client";
import { Server } from "socket.io";

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

        socket.join(user.id);
        socket.on('echo', (msg) => {
            socket.request
            socket.emit('echo', `Echo: ${msg}`);
        });
    });

    io.on('disconnect', (socket) => {
        const { user } = (socket.request as { user?: User });
        console.log('Socket.io disconnect');
    });

    io.on('error', (socket) => {
        console.log('Socket.io error');
    })

    io.on('reconnect', (socket) => {
        const { user } = (socket.request as { user?: User });
        console.log('Socket.io reconnect');
    })
}

export default EventRouter;