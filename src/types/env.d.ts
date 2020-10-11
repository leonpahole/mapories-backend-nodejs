declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: string;
    PORT: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_DATABASE: string;
    FRONTEND_URL: string;
    COOKIE_DOMAIN: string;
    SESSION_SECRET: string;
    JWT_SECRET: string;
    REDIS_HOST: string;
    MAILGUN_DOMAIN: string;
    MAILGUN_API_KEY: string;
    MAIL_FROM: string;
    TWITTER_CONSUMER_KEY: string;
    TWITTER_CONSUMER_SECRET: string;
  }
}
