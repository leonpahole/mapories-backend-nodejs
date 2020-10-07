import { Container } from "inversify";
import TYPES from "./types";
import { LogService } from "../services/log.service";
import { UserService } from "../services/user.service";
import { MailService } from "../services/mail.service";

export class ContainerConfigLoader {
  public static Load(): Container {
    const container = new Container();
    container.bind<LogService>(TYPES.LogService).to(LogService);
    container.bind<UserService>(TYPES.UserService).to(UserService);
    container.bind<MailService>(TYPES.MailService).to(MailService);
    return container;
  }
}
