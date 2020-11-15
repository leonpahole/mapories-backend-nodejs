import { injectable, inject } from "inversify";
import {
  Controller,
  Payload,
  ConnectedSocket,
  OnConnect,
  OnDisconnect,
  OnMessage,
  SocketQueryParam,
} from "inversify-socket-utils";
import "reflect-metadata";
import { ISocket } from "../../types/socket";
import TYPES from "../../config/types";
import { logger } from "../../utils/logger";
import {
  ChatSocketService,
  CHAT_NAMESPACE,
} from "../socket-service/chat.socket-service";
import { SocketSubscriber } from "../redis/socketSubscriber";
import { UserService } from "../../services/user.service";

export interface ChatroomMessage {
  chatroomId: string;
  message: string;
}

@injectable()
@Controller(CHAT_NAMESPACE)
export class ChatSocketController {
  constructor(
    // eslint-disable-next-line
    @inject(TYPES.SocketSubscriber) private socketSubscriber: SocketSubscriber,
    @inject(TYPES.ChatSocketService)
    private chatSocketService: ChatSocketService,
    @inject(TYPES.UserService)
    private userService: UserService
  ) {}

  @OnConnect("connection")
  async connection(
    @SocketQueryParam("id") id: string,
    @ConnectedSocket() socket: ISocket
  ) {
    const user = await this.userService.getAuthUserById(id);
    if (!user) {
      logger.info(`Invalid id : ${id}, disconnecting`);
      socket.disconnect();
      return;
    }

    logger.info(`Client connected to chat: ${id}`);
    socket.localData = {
      user,
    };
    this.chatSocketService.joinChatroomsSendOnlineStatusAndSendChatroomStatuses(
      socket
    );
  }

  @OnDisconnect("disconnect")
  async disconnect(@ConnectedSocket() socket: ISocket) {
    logger.info(`Client disconnected from chat`);
    if (socket.localData) {
      this.chatSocketService.sendOfflineStatus(socket);
    }
  }

  @OnMessage("event://send-message")
  message(
    @Payload() message: ChatroomMessage,
    @ConnectedSocket() socket: ISocket
  ) {
    logger.info("Message received");
    this.chatSocketService.sendMessage(socket, message);
  }
}
