import { Request, Response, NextFunction } from "express";
import { __prod__ } from "./config/constants";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { IRequest } from "./types/api";
import { StatusCodes as HttpStatus } from "http-status-codes";
import { CommonError } from "./errors/common.error";
import { AppError } from "./errors/AppError";
import { logger } from "./utils/logger";

export const notFoundHandler = (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(HttpStatus.NOT_FOUND);
  next(CommonError.NOT_FOUND);
};

export const errorHandler = (
  err: Error,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  if (err instanceof AppError) {
    statusCode = err.httpCode;
  } else {
    logger.error(err);
  }

  res.status(statusCode);
  res.json({
    message: err.message,
    stack: __prod__ ? "" : err.stack,
  });
};

// thanks to https://medium.com/@saman.ghm/validation-and-conversion-request-body-in-one-line-for-node-js-with-typescript-6adfac0ccd0a
export const validation = (dtoClass: any) => {
  return function (req: Request, res: Response, next: NextFunction) {
    const output: any = plainToClass(dtoClass, req.body);
    validate(output, { skipMissingProperties: true }).then((errors) => {
      if (errors.length > 0) {
        const errObj: Record<string, string> = {};

        for (const errorItem of errors) {
          const items = Object.values(errorItem.constraints || {});
          if (items.length > 0) {
            errObj[errorItem.property] = items[0];
          } else {
            errObj[errorItem.property] = "Unknown error";
          }
        }

        res.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
          message: "VALIDATION_ERROR",
          errors: errObj,
        });

        return;
      } else {
        next();
      }
    });
  };
};

export const isAuth = (req: IRequest, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    res.status(HttpStatus.UNAUTHORIZED);
    throw CommonError.REQUIRES_AUTH_ERROR;
  }

  return next();
};
