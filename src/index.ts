import "reflect-metadata";
import { __prod__ } from "./config/constants";

if (!__prod__) {
  require("dotenv-safe").config();
}

import { DbConnection } from "./db/db.connection";
import { logger } from "./utils/logger";

import { setupSessionRedis } from "./boot/setupSessionRedis";
import { setupExpressApp } from "./boot/setupExpressApp";
import { createFileDirs } from "./boot/createFileDirs";

DbConnection.initConnection().then(() => {
  DbConnection.setAutoReconnect();

  const { redis, RedisStore } = setupSessionRedis();
  const port = setupExpressApp(redis, RedisStore);
  createFileDirs();

  logger.info(`Server started on port ${port}`);
});
