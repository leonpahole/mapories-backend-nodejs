import mongoose from "mongoose";
import { logger } from "../utils/logger";

export class DbConnection {
  public static getConnectUrl(): string {
    return `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${
      process.env.DB_HOST
    }:${process.env.DB_PORT || "27017"}/${process.env.DB_DATABASE}`;
  }

  public static async initConnection() {
    await DbConnection.connect(this.getConnectUrl());
  }

  public static async connect(connStr: string) {
    return mongoose
      .connect(connStr, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => {
        logger.info("Connected to the database");
      })
      .catch((error) => {
        logger.error("Error connecting to database: ", error);
        return process.exit(1);
      });
  }

  public static setAutoReconnect() {
    mongoose.connection.on("disconnected", () =>
      DbConnection.connect(this.getConnectUrl())
    );
  }

  public static async disconnect() {
    await mongoose.connection.close();
  }
}
