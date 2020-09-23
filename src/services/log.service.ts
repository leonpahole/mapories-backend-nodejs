import { injectable } from "inversify";
import LogEntry, { ILogEntry } from "../db/models/logEntry.model";

interface ICreateLogInput {
  title: string;
  description?: string;
  comment?: string;
  rating?: number;
  image?: string;
  latitude: number;
  longitude: number;
  visitDate: Date;
}

@injectable()
export class LogService {
  public getLogs(): Promise<ILogEntry[]> {
    return LogEntry.find({}).exec();
  }

  public getLog(id: string): Promise<ILogEntry | null> {
    return LogEntry.findOne({ _id: id }).exec();
  }

  public createLog(data: ICreateLogInput): Promise<ILogEntry> {
    return LogEntry.create(data);
  }
}
