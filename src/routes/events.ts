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
        })
    });
}

export default EventRouter;