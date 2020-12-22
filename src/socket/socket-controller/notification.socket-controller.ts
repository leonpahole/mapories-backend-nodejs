import { inject, injectable } from "inversify";
import {
  ConnectedSocket,
  Controller,
  OnConnect,
  OnDisconnect,
  SocketQueryParam,
} from "inversify-socket-utils";
import "reflect-metadata";
import TYPES from "../../config/types";
import { UserService } from "../../services/user.service";
import { ISocket } from "../../types/socket";
import { logger } from "../../utils/logger";
import {
  NotificationSocketService,
  NOTIFICATION_NAMESPACE,
} from "../socket-service/notification.socket-service";

export interface ChatroomMessage {
  chatroomId: string;
  message: string;
}

@injectable()
@Controller(NOTIFICATION_NAMESPACE)
export class NotificationSocketController {
  constructor(
    @inject(TYPES.NotificationSocketService)
    private notificationSocketService: NotificationSocketService,
    @inject(TYPES.UserService)
    private userService: UserService
  ) {}

  @OnConnect("connection")
  async connection(
    @SocketQueryParam("token") token: string,
    @ConnectedSocket() socket: ISocket
  ) {
    const user = await this.userService.getAuthUserByJwt(token);
    if (!user) {
      logger.info(`Invalid token, disconnecting`);
      socket.disconnect();
      return;
    }

    logger.info(`Client connected to notifications: ${user.id}`);
    this.notificationSocketService.joinNotificationRoom(socket, user.id);
  }

  @OnDisconnect("disconnect")
  async disconnect() {
    logger.info(`Client disconnected from notifications`);
  }
}
