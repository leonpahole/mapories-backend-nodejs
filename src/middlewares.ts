import { Request, Response, NextFunction } from "express";
import { __prod__ } from "./config/constants";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { logger } from "./utils/logger";

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

// thanks to https://medium.com/@saman.ghm/validation-and-conversion-request-body-in-one-line-for-node-js-with-typescript-6adfac0ccd0a
export const validation = (dtoClass: any) => {
  return function (req: Request, res: Response, next: NextFunction) {
    const output: any = plainToClass(dtoClass, req.body);
    validate(output, { skipMissingProperties: true }).then((errors) => {
      if (errors.length > 0) {
        logger.error(errors);
        let errorTexts = Array();
        for (const errorItem of errors) {
          errorTexts = errorTexts.concat(errorItem.constraints);
        }
        res.status(422).send(errorTexts);
        return;
      } else {
        next();
      }
    });
  };
};
