import { Container } from "inversify";
import TYPES from "./types";
import { LogService } from "../services/log.service";

export class ContainerConfigLoader {
  public static Load(): Container {
    const container = new Container();
    container.bind<LogService>(TYPES.LogService).to(LogService);
    return container;
  }
}
