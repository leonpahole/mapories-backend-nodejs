import { StatusCodes as HttpStatus } from "http-status-codes";

export class AppError extends Error {
  httpCode: number;

  constructor(
    message: string,
    httpCode: number = HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.httpCode = httpCode;
  }
}
