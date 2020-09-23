import {
  controller,
  httpGet,
  httpPost,
  interfaces,
} from "inversify-express-utils";
import { inject } from "inversify";
import TYPES from "../config/types";
import { LogService } from "../services/log.service";
import { Request } from "express";
import { ILogEntry } from "../db/models/logEntry.model";

@controller("/log")
export class LogController implements interfaces.Controller {
  constructor(@inject(TYPES.LogService) private logService: LogService) {}

  @httpGet("/")
  public getLogs(): Promise<ILogEntry[]> {
    return this.logService.getLogs();
  }

  @httpGet("/:id")
  public getLog(request: Request): Promise<ILogEntry | null> {
    return this.logService.getLog(request.params.id);
  }

  @httpPost("/")
  public newLog(request: Request): Promise<ILogEntry> {
    return this.logService.createLog(request.body);
  }
}
