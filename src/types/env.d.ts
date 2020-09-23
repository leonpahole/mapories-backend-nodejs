declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: string;
    PORT: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_DATABASE: string;
    CORS_ORIGIN: string;
  }
}
