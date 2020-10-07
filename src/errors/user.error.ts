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
};
