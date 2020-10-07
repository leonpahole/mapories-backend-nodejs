import { StatusCodes as HttpStatus } from "http-status-codes";
import { AppError } from "./AppError";

export const CommonError = {
  NOT_FOUND: new AppError("NOT_FOUND", HttpStatus.NOT_FOUND),
  INTERNAL_SERVER_ERROR: new AppError("INTERNAL_SERVER_ERROR"),
  UNKNOWN_ERROR: new AppError("UNKNOWN_ERROR"),
  VALIDATION_ERROR: new AppError(
    "VALIDATION_ERROR",
    HttpStatus.UNPROCESSABLE_ENTITY
  ),
  REQUIRES_AUTH_ERROR: new AppError(
    "REQUIRES_AUTH_ERROR",
    HttpStatus.UNAUTHORIZED
  ),
};
