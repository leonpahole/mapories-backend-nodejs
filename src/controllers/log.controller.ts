import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  requestParam,
  requestBody,
  response,
} from "inversify-express-utils";
import { inject } from "inversify";
import TYPES from "../config/types";
import { LogService } from "../services/log.service";
import { ILogEntry } from "../db/models/logEntry.model";
import { IsDate, Min, Max, IsOptional, IsDefined } from "class-validator";
import { validation } from "../middlewares";
import { Type } from "class-transformer";
import { Response } from "express";

export class NewLogRequest {
  @IsDefined()
  public title!: string;

  @IsOptional()
  public description?: string;

  @IsOptional()
  public comment?: string;

  @IsOptional()
  @Min(0)
  @Max(10)
  public rating?: number;

  @IsOptional()
  public image?: string;

  @Max(90)
  @Min(-90)
  @IsDefined()
  public latitude!: number;

  @Max(180)
  @Min(-180)
  @IsDefined()
  public longitude!: number;

  @IsDate()
  @Type(() => Date)
  @IsDefined()
  public visitDate!: Date;
}

@controller("/log")
export class LogController implements interfaces.Controller {
  constructor(@inject(TYPES.LogService) private logService: LogService) {}

  @httpGet("/")
  public getLogs(): Promise<ILogEntry[]> {
    return this.logService.getLogs();
  }

  @httpGet("/:id")
  public async getLog(
    @requestParam("id") id: string,
    @response() res: Response
  ): Promise<ILogEntry> {
    const log = await this.logService.getLog(id);
    if (!log) {
      res.statusCode = 404;
      throw new Error("Not found");
    }

    return log;
  }

  @httpPost("/", validation(NewLogRequest))
  public newLog(@requestBody() body: NewLogRequest): Promise<ILogEntry> {
    return this.logService.createLog(body);
  }
}
