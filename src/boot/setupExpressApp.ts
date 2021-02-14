import cors from "cors";
import express, { json } from "express";
import helmet from "helmet";
import { InversifyExpressServer } from "inversify-express-utils";
import { InversifySocketServer } from "inversify-socket-utils";
import { PUBLIC_DIR } from "../config/constants";
import { container } from "../config/container";

import "../controllers/auth.controller";
import "../controllers/chat.controller";
import "../controllers/post.controller";
import "../controllers/comment.controller";
import "../controllers/user.controller";
import "../controllers/notification.controller";
import "../controllers/push.controller";

import { errorHandler, notFoundHandler, requestLogger } from "../middlewares";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

export const setupExpressApp = () => {
  // start the server
  const server = new InversifyExpressServer(container);

  server.setConfig((app) => {
    // app.use(pino());
    app.use(requestLogger);
    app.use(helmet());
    app.use(
      cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
      })
    );
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(json());
    app.use("/public", express.static(PUBLIC_DIR));
  });

  const serverInstance = server.build();

  serverInstance.use(notFoundHandler);
  serverInstance.use(errorHandler);

  const port = process.env.PORT || 4000;
  const httpServer = serverInstance.listen(port);

  const socketServer = new InversifySocketServer(
    container,
    require("socket.io")(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
    })
  );
  socketServer.build();

  container
    .bind<InversifySocketServer>("InversifySocketServer")
    .toConstantValue(socketServer);

  return port;
};
