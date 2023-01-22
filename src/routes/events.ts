import { User } from "@prisma/client";
import { Server } from "socket.io";

const EventRouter = (io: Server) => {
    io.on("connection", (socket) => {
        const { user } = (socket.request as { user?: User });
        console.log('Socket.io', user);
        if (!user) {
            return socket.disconnect();
        }
        socket.join(user.id);
        socket.on('echo', (msg) => {
            socket.request
            socket.emit('echo', `Echo: ${msg}`);
        });
    });

    io.on('disconnect', (socket) => {
        const { user } = (socket.request as { user?: User });
        console.log('Socket.io disconnect', socket);
    });

    io.on('error', (socket) => {
        console.log('Socket.io error', socket);
    })

    io.on('reconnect', (socket) => {
        const { user } = (socket.request as { user?: User });
        console.log('Socket.io reconnect', socket);
    })
}

export default EventRouter;