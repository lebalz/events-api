import { strategyForEnvironment } from "./../auth/index";
import express from "express";
import compression from "compression";
import prisma from "./prisma";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import passport from "passport";
import { getMail } from "./helpers";

const PORT = process.env.PORT || 3002;

const app = express();
app.use(compression(), express.json({ limit: "5mb" }));
// Serve the static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// ensure the server can call other domains: enable cross origin resource sharing (cors)
app.use(cors());

// received packages should be presented in the JSON format
app.use(express.json());

// show some helpful logs in the commandline
app.use(morgan("combined"));
passport.use(strategyForEnvironment());
app.use(passport.initialize());

// Enable CORS (for local testing only -remove in production/deployment)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Public Endpoints
app.get("/api", (req, res) => {
  return res.status(200).send("Welcome to the EVENTES-API V1.0");
});

app.get(
  "/api/user",
  passport.authenticate("oauth-bearer", { session: false }),
  async (req, res) => {
    const email = getMail(req.authInfo);
    try {
      const user = await prisma.user.findUnique({
        where: { email: email },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

app.get(
  "/api/users",
  passport.authenticate("oauth-bearer", { session: false }),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({});
      res.json(users);
    } catch (error) {
      res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

app.get(
  "/api/events",
  passport.authenticate("oauth-bearer", { session: false }),
  async (req, res) => {
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
      res.status(500).json({
        message: "Something went wrong",
        error: JSON.stringify(error)
      });
    }
  }
);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
