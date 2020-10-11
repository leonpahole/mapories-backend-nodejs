import { StatusCodes as HttpStatus } from "http-status-codes";
import { AppError } from "./AppError";

export const SocialAuthError = {
  INVALID_SOCIAL_PROVIDER: new AppError(
    "INVALID_SOCIAL_PROVIDER",
    HttpStatus.UNPROCESSABLE_ENTITY
  ),
  TWITTER_REQUEST_TOKEN_FAILURE: new AppError(
    "TWITTER_REQUEST_TOKEN_FAILURE",
    HttpStatus.BAD_REQUEST
  ),
  SOCIAL_PROFILE_REQUEST_FAILURE: new AppError(
    "SOCIAL_PROFILE_REQUEST_FAILURE",
    HttpStatus.INTERNAL_SERVER_ERROR
  ),
};
