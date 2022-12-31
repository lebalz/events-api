import { Server } from "socket.io";

const EventRouter = (io: Server) => {
    io.on("connection", (socket) => {
        console.log('Socket.io', (socket.request as any).user);
        socket.on('echo', (msg) => {
          socket.emit('echo', `Echo: ${msg}`);
        })
      });
}

export default EventRouter;