import { InversifyExpressServer } from "inversify-express-utils";
import { ContainerConfigLoader } from "../config/container";
import helmet from "helmet";
import cors from "cors";
import express, { json } from "express";
import session from "express-session";
import { COOKIE_NAME, PUBLIC_DIR } from "../constants";
import { __prod__ } from "../config/constants";
import { notFoundHandler, errorHandler } from "../middlewares";
import IORedis from "ioredis";
import s from "connect-redis";

import "../controllers/auth.controller";
import "../controllers/user.controller";
import "../controllers/log.controller";

export const setupExpressApp = (
  redis: IORedis.Redis,
  RedisStore: s.RedisStore
) => {
  const container = ContainerConfigLoader.Load();

  // start the server
  const server = new InversifyExpressServer(container);

  server.setConfig((app) => {
    // app.use(pino());
    app.use(helmet());
    app.use(
      cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
      })
    );
    app.use(json());
    app.use("/public", express.static(PUBLIC_DIR));

    app.use(
      session({
        name: COOKIE_NAME,
        store: new RedisStore({
          client: redis,
          disableTouch: true,
        }),
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 365 * 20,
          httpOnly: true,
          sameSite: "lax",
          secure: __prod__,
          domain: __prod__ ? process.env.COOKIE_DOMAIN : undefined,
        },
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: false,
      })
    );
  });

  const serverInstance = server.build();

  serverInstance.use(notFoundHandler);
  serverInstance.use(errorHandler);

  const port = process.env.PORT || 4000;
  serverInstance.listen(port);

  return port;
};
