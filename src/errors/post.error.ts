import { StatusCodes as HttpStatus } from "http-status-codes";
import { AppError } from "./AppError";

export const PostError = {
  NOT_MY_POST: new AppError("NOT_MY_POST", HttpStatus.FORBIDDEN),
  NOT_FRIENDS_WITH_USER: new AppError(
    "NOT_FRIENDS_WITH_USER",
    HttpStatus.FORBIDDEN
  ),
};
