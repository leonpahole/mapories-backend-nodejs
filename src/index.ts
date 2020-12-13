import "reflect-metadata";
import { __prod__ } from "./config/constants";

if (!__prod__) {
  require("dotenv-safe").config();
}

import { DbConnection } from "./db/db.connection";
import { logger } from "./utils/logger";

import { setupExpressApp } from "./boot/setupExpressApp";
import { createFileDirs } from "./boot/createFileDirs";

DbConnection.initConnection().then(() => {
  DbConnection.setAutoReconnect();

  const port = setupExpressApp();
  createFileDirs();

  logger.info(`Server started on port ${port}`);
});
