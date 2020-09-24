import { injectable } from "inversify";
import LogEntry, { ILogEntry } from "../db/models/logEntry.model";
import { NewLogRequest } from "../controllers/log.controller";
import { logger } from "../utils/logger";

@injectable()
export class LogService {
  public getLogs(): Promise<ILogEntry[]> {
    return LogEntry.find({}).exec();
  }

  public async getLog(id: string): Promise<ILogEntry | null> {
    try {
      return await LogEntry.findOne({ _id: id }).exec();
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  public createLog(data: NewLogRequest): Promise<ILogEntry> {
    return LogEntry.create(data);
  }
}
