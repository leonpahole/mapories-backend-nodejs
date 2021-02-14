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
    @inject(TYPES.SocketSubscriber)
    private socketSubscriber: SocketSubscriber,
    @inject(TYPES.ChatSocketService)
    private chatSocketService: ChatSocketService,
    @inject(TYPES.UserService)
    private userService: UserService
  ) {
    this.socketSubscriber;
  }

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

    logger.info(`Client connected to chat: ${user.id}`);
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

  @OnMessage("event://send-chatroom-read")
  chatroomRead(
    @Payload() chatroomId: string,
    @ConnectedSocket() socket: ISocket
  ) {
    logger.info("Message received");
    this.chatSocketService.sendChatroomRead(socket, chatroomId);
  }

  @OnMessage("event://send-chatroom-typing")
  chatroomTyping(
    @Payload() payload: { chatroomId: string; typing: boolean },
    @ConnectedSocket() socket: ISocket
  ) {
    logger.info("Message received");
    this.chatSocketService.sendChatroomTyping(
      socket,
      payload.chatroomId,
      payload.typing
    );
  }
}
