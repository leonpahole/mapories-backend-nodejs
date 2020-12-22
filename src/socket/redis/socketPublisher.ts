import { injectable } from "inversify";

import Redis from "ioredis";
import { SocketMessage } from "../../types/socket";
import { logger } from "../../utils/logger";

@injectable()
export class SocketPublisher {
  redisClient: Redis.Redis;

  constructor() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
    });
    logger.info("Redis client ready for emitting of messages");
  }

  async publish(message: SocketMessage) {
    const messageJson = JSON.stringify(message);
    logger.info("Publish: " + messageJson);
    this.redisClient.publish("socket", messageJson);
  }
}
