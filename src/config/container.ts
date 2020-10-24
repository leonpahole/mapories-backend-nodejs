import { Container } from "inversify";
import TYPES from "./types";
import { MaporyService } from "../services/mapory.service";
import { UserService } from "../services/user.service";
import { MailService } from "../services/mail.service";
import { SocialAuthService } from "../services/social-auth.service";
import { ImageService } from "../services/image.service";

export class ContainerConfigLoader {
  public static Load(): Container {
    const container = new Container();
    container.bind<MaporyService>(TYPES.MaporyService).to(MaporyService);
    container.bind<UserService>(TYPES.UserService).to(UserService);
    container.bind<MailService>(TYPES.MailService).to(MailService);
    container.bind<ImageService>(TYPES.ImageService).to(ImageService);
    container
      .bind<SocialAuthService>(TYPES.SocialAuthService)
      .to(SocialAuthService);
    return container;
  }
}
