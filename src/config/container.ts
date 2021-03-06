import { Container } from "inversify";
import TYPES from "./types";
import { UserService } from "../services/user.service";
import { MailService } from "../services/mail.service";
import { SocialAuthService } from "../services/social-auth.service";
import { ImageService } from "../services/image.service";
import { PostService } from "../services/post.service";
import { AuthService } from "../services/auth.service";
import { Interfaces, TYPE } from "inversify-socket-utils";
import { ChatSocketController } from "../socket/socket-controller/chat.socket-controller";
import { NotificationSocketController } from "../socket/socket-controller/notification.socket-controller";
import { ChatService } from "../services/chat.service";
import { SocketService } from "../socket/socket-service/socket.service";
import { SocketPublisher } from "../socket/redis/socketPublisher";
import { SocketSubscriber } from "../socket/redis/socketSubscriber";
import { FriendService } from "../services/friend.service";
import { UserUtilsService } from "../services/userUtils.service";
import { ChatSocketService } from "../socket/socket-service/chat.socket-service";
import { JwtService } from "../services/jwt.service";
import { CommentService } from "../services/comment.service";
import { NotificationService } from "../services/notification.service";
import { NotificationSocketService } from "../socket/socket-service/notification.socket-service";
import { PushService } from "../services/push.service";
import { MobilePushService } from "../services/mobile-push.service";

const container = new Container();
container.bind<AuthService>(TYPES.AuthService).to(AuthService);
container.bind<JwtService>(TYPES.JwtService).to(JwtService);
container.bind<UserService>(TYPES.UserService).to(UserService);
container.bind<UserUtilsService>(TYPES.UserUtilsService).to(UserUtilsService);
container.bind<FriendService>(TYPES.FriendService).to(FriendService);
container.bind<MailService>(TYPES.MailService).to(MailService);
container.bind<ImageService>(TYPES.ImageService).to(ImageService);
container
  .bind<SocialAuthService>(TYPES.SocialAuthService)
  .to(SocialAuthService);
container.bind<PostService>(TYPES.PostService).to(PostService);
container.bind<CommentService>(TYPES.CommentService).to(CommentService);
container.bind<ChatService>(TYPES.ChatService).to(ChatService);
container.bind<SocketService>(TYPES.SocketService).to(SocketService);
container
  .bind<ChatSocketService>(TYPES.ChatSocketService)
  .to(ChatSocketService);
container
  .bind<NotificationSocketService>(TYPES.NotificationSocketService)
  .to(NotificationSocketService);
container.bind<PushService>(TYPES.PushService).to(PushService);
container
  .bind<MobilePushService>(TYPES.MobilePushService)
  .to(MobilePushService);

container
  .bind<NotificationService>(TYPES.NotificationService)
  .to(NotificationService);

container
  .bind<SocketPublisher>(TYPES.SocketPublisher)
  .to(SocketPublisher)
  .inSingletonScope();
container
  .bind<SocketSubscriber>(TYPES.SocketSubscriber)
  .to(SocketSubscriber)
  .inSingletonScope();

// socket
container
  .bind<Interfaces.Controller>(TYPE.Controller)
  .to(ChatSocketController)
  .whenTargetNamed("ChatSocketController");
container
  .bind<Interfaces.Controller>(TYPE.Controller)
  .to(NotificationSocketController)
  .whenTargetNamed("NotificationSocketController");
export { container };
