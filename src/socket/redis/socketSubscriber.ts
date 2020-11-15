import { injectable, inject } from "inversify";
import TYPES from "../../config/types";
import { SocketService } from "../socket-service/socket.service";

import Redis from "ioredis";
import { SocketMessage } from "../../types/socket";
import { logger } from "../../utils/logger";

@injectable()
export class SocketSubscriber {
  redisClient: Redis.Redis;

  constructor(
    @inject(TYPES.SocketService) private socketService: SocketService
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
    });
    this.redisClient.subscribe("socket", () => {
      logger.info("Redis client subscribed to socket messages");
      this.redisClient.on("message", (_, message) => {
        const msg = JSON.parse(message) as SocketMessage;
        logger.info(msg);
        this.socketService.emit(
          msg.namespace,
          msg.topic,
          msg.room,
          msg.payload
        );
      });
    });
  }
}
