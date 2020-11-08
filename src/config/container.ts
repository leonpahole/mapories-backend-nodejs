import { Container } from "inversify";
import TYPES from "./types";
import { UserService } from "../services/user.service";
import { MailService } from "../services/mail.service";
import { SocialAuthService } from "../services/social-auth.service";
import { ImageService } from "../services/image.service";
import { PostService } from "../services/post.service";
import { AuthService } from "../services/auth.service";

export class ContainerConfigLoader {
  public static Load(): Container {
    const container = new Container();
    container.bind<AuthService>(TYPES.AuthService).to(AuthService);
    container.bind<UserService>(TYPES.UserService).to(UserService);
    container.bind<MailService>(TYPES.MailService).to(MailService);
    container.bind<ImageService>(TYPES.ImageService).to(ImageService);
    container
      .bind<SocialAuthService>(TYPES.SocialAuthService)
      .to(SocialAuthService);
    container.bind<PostService>(TYPES.PostService).to(PostService);
    return container;
  }
}
