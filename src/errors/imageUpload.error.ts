import { StatusCodes as HttpStatus } from "http-status-codes";
import { AppError } from "./AppError";

export const ImageUploadError = {
  COMPRESS_ERROR: new AppError(
    "COMPRESS_ERROR",
    HttpStatus.INTERNAL_SERVER_ERROR
  ),
  DOWNLOAD_ERROR: new AppError(
    "DOWNLOAD_ERROR",
    HttpStatus.INTERNAL_SERVER_ERROR
  ),
  WRITE_ERROR: new AppError("WRITE_ERROR", HttpStatus.INTERNAL_SERVER_ERROR),
};
