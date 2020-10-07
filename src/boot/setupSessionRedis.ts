import connectRedis from "connect-redis";
import session from "express-session";
import Redis from "ioredis";

export const setupSessionRedis = () => {
  const RedisStore = connectRedis(session);
  const redis = new Redis({
    host: process.env.REDIS_HOST,
  });

  return { RedisStore, redis };
};
