import { Departements, Event, Prisma, User } from '@prisma/client';
import { strategyForEnvironment } from "./../auth/index";
import express, { Request, Response, NextFunction } from "express";
import session, { Session } from 'express-session';
import compression from "compression";
import prisma from "./prisma";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";
import { findUser, getAuthInfo } from "./helpers";
import data from "../data.json";
import { Server } from "socket.io";
import http from 'http';

declare module 'http' {
  interface IncomingMessage {
    session: Session & {
      authenticated: boolean
    }
  }
}

/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 * 
 */

const PORT = process.env.PORT || 3002;

interface ErrorResponse {
  message: string,
  error: any
}

const app = express();
const server = http.createServer(app);

app.use(compression(), express.json({ limit: "5mb" }));
// Serve the static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(cors({
  credentials: true,
  origin: process.env.CORS_ORIGIN || true, /* true = strict origin */
}));

// received packages should be presented in the JSON format
app.use(express.json());

// show some helpful logs in the commandline
app.use(morgan("combined"));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false /** TODO: check if false is ok */
});

app.use(sessionMiddleware)


app.use(passport.initialize());
app.use(passport.session());

passport.use(strategyForEnvironment());

passport.serializeUser((user, done) => {
  console.log('ser', (user as User).id);
  done(null, (user as User).id)
})


passport.deserializeUser(async (id, done) => {
  console.log('deser', id);
  const user = await prisma.user.findUnique({ where: { id: id as string } })
  done(null, user)
});

// Public Endpoints
app.get("/api", (req, res) => {
  return res.status(200).send("Welcome to the EVENTES-API V1.0");
});

app.get('/api/checklogin',
  passport.authenticate("oauth-bearer", { session: true }),
  async (req, res) => {
    res.status(req.user ? 200 : 401).send('OK')
  }
);


app.get(
  "/api/user",
  passport.authenticate("oauth-bearer", { session: true }),
  async (req, res, next) => {
    if (req.user) {
      return res.json(req.user);
    }
    res.status(401).send('Not Authorized');
  }
);

app.get(
  "/api/users",
  passport.authenticate("oauth-bearer", { session: true }),
  async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({});
      res.json(users);
    } catch (error) {
      next(error)
    }
  }
);

app.get(
  "/api/events",
  passport.authenticate("oauth-bearer", { session: true }),
  async (req, res, next) => {
    try {
      const events = await prisma.event
        .findMany({
          include: { responsible: true, author: true },
        })
        .then((events) => {
          return events.map((event) => {
            return {
              ...event,
              author: undefined,
              authorId: event.author.id,
              responsible: undefined,
              responsibleIds: event.responsible.map((r) => r.id),
            };
          });
        });
      res.json(events);
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/user/:id/events",
  passport.authenticate("oauth-bearer", { session: true }),
  async (req: Request<{ id: string }, Event | ErrorResponse, { start: string, end: string, allDay: boolean, location: string, description: string, descriptionLong: string, departemens: Departements[], classes: string[], onlyKLP: boolean }>, res, next) => {
    const { start, end, allDay, location, description, descriptionLong, classes, departemens, onlyKLP } = req.body;
    try {
      const event = await prisma.event.create({
        data: {
          start: start,
          end: end,
          allDay: allDay,
          description: description,
          descriptionLong: descriptionLong,
          location: location,
          state: 'DRAFT',
          author: {
            connect: {
              id: req.params.id
            }
          }
        }
      });
      res.status(200).json(event);
    } catch (e) {
      next(e)
    }
  }
);

app.get(
  "/api/untis",
  passport.authenticate("oauth-bearer", { session: true }),
  async (req, res) => {
    res.json(data);
  }
);


const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    methods: ["GET", "POST"]
  }
});


// convert a connect middleware to a Socket.IO middleware
io.use((socket, next) => {
  sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
});
io.use((socket, next) => {
  passport.initialize()(socket.request as Request, {} as Response, next as NextFunction)
});
io.use((socket, next) => {
  passport.session()(socket.request as Request, {} as Response, next as NextFunction)
});
// only allow authenticated users
io.use((socket, next) => {
  if ((socket.request as any).user) {
    next();
  } else {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log('Socket.io', (socket.request as any).user);
  socket.on('echo', (msg) => {
    socket.emit('echo', `Echo: ${msg}`);
  })
});


// app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

server.listen(PORT || 3002, () => {
  console.log(`application is running at: http://localhost:${PORT}`);
});
