import { Request, Response, NextFunction } from "express";
import { __prod__ } from "./config/constants";

export const notFoundHandler = (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new Error("Not found");
  res.status(404);
  next(error);
};

export const errorHandler = (
  err: Error,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: __prod__ ? "" : err.stack,
  });
};
