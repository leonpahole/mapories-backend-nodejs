import { StatusCodes as HttpStatus } from "http-status-codes";
import { AppError } from "./AppError";

export const UserError = {
  EMAIL_EXISTS: new AppError("EMAIL_EXISTS", HttpStatus.CONFLICT),
  VERIFY_EMAIL_SENDING_ERROR: new AppError("VERIFY_EMAIL_SENDING_ERROR"),
  INVALID_TOKEN: new AppError("INVALID_VERIFY_TOKEN"),
  WRONG_LOGIN_CREDENTIALS: new AppError(
    "WRONG_LOGIN_CREDENTIALS",
    HttpStatus.UNAUTHORIZED
  ),
  ACCOUNT_NOT_VERIFIED: new AppError(
    "ACCOUNT_NOT_VERIFIED",
    HttpStatus.FORBIDDEN
  ),
  FORGOT_PASSWORD_EMAIL_SENDING_ERROR: new AppError(
    "FORGOT_PASSWORD_EMAIL_SENDING_ERROR"
  ),
  CANT_BEFRIEND_MYSELF: new AppError(
    "CANT_BEFRIEND_MYSELF",
    HttpStatus.CONFLICT
  ),
  USERS_ALREADY_FRIENDS: new AppError(
    "USERS_ALREADY_FRIENDS",
    HttpStatus.CONFLICT
  ),
  REQUEST_ALREADY_SENT_FROM_YOU: new AppError(
    "REQUEST_ALREADY_SENT_FROM_YOU",
    HttpStatus.CONFLICT
  ),
  REQUEST_ALREADY_SENT_TO_YOU: new AppError(
    "REQUEST_ALREADY_SENT_TO_YOU",
    HttpStatus.CONFLICT
  ),
  FRIEND_REQUEST_NOT_FOUND: new AppError(
    "FRIEND_REQUEST_NOT_FOUND",
    HttpStatus.NOT_FOUND
  ),
};
