import "reflect-metadata";
import { __prod__ } from "./config/constants";

if (!__prod__) {
  require("dotenv-safe").config();
}

import pino from "pino-http";
import helmet from "helmet";
import cors from "cors";
import { json } from "express";
import { errorHandler, notFoundHandler } from "./middlewares";

import { DbConnection } from "./db/db.connection";
import { ContainerConfigLoader } from "./config/container";

import { InversifyExpressServer } from "inversify-express-utils";
import "./controllers/log.controller";
import { logger } from "./utils/logger";

const container = ContainerConfigLoader.Load();

DbConnection.initConnection().then(() => {
  DbConnection.setAutoReconnect();

  // start the server
  const server = new InversifyExpressServer(container);

  server.setConfig((app) => {
    app.use(pino());
    app.use(helmet());
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN,
      })
    );
    app.use(json());
  });

  const serverInstance = server.build();

  serverInstance.use(notFoundHandler);
  serverInstance.use(errorHandler);

  serverInstance.listen(process.env.PORT || 4000);
  logger.info(`Server started on port ${process.env.PORT} :)`);
});
