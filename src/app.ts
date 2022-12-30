import { Departements, Event, Prisma, User } from '@prisma/client';
import { strategyForEnvironment } from "./../auth/index";
import express, { Request } from "express";
import session from 'express-session';
import compression from "compression";
import prisma from "./prisma";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";
import { findUser, getAuthInfo } from "./helpers";
import data from "../data.json";

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

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: true
}))


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


app.get(
  "/api/user",
  passport.authenticate("oauth-bearer", { session: true }),
  async (req, res, next) => {
    findUser(req.authInfo).then((user) => {
      if (user) {
        return res.json(user);
      }
      throw new Error('No credentials provided');
    }).catch((err) => {
      next(err)
    })
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

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
