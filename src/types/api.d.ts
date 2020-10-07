import { Request } from "express";

export type IRequest = Request & {
  session: Express.Session & { userId: string };
};
