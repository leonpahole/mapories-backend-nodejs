import { injectable, inject } from "inversify";
import TYPES from "../../config/types";
import { SocketPublisher } from "../redis/socketPublisher";
import { ChatService } from "../../services/chat.service";
import { IChatroom } from "../../db/models/chatroom.model";
import { ISocket } from "../../types/socket";
import { ChatroomMessage } from "../socket-controller/chat.socket-controller";
import { SocketService } from "./socket.service";
import { MobilePushService } from "../../services/mobile-push.service";
import { PushService } from "../../services/push.service";
import { logger } from "../../utils/logger";

export const CHAT_NAMESPACE = "/chat";

@injectable()
export class ChatSocketService {
  constructor(
    @inject(TYPES.SocketPublisher) private socketPublisher: SocketPublisher,
    @inject(TYPES.ChatService) private chatService: ChatService,
    @inject(TYPES.SocketService) private socketService: SocketService,
    @inject(TYPES.MobilePushService)
    private mobilePushService: MobilePushService,
    @inject(TYPES.PushService) private pushService: PushService
  ) {}

  public async joinChatroomsSendOnlineStatusAndSendChatroomStatuses(
    socket: ISocket
  ): Promise<void> {
    const chatrooms = await this.chatService.getUsersChatroomIds(
      socket.localData.user.id
    );
    this.joinChatrooms(chatrooms, socket);
    this.sendOnlineOrOfflineStatus(chatrooms, socket, true);
    this.sendChatroomStatuses(chatrooms, socket);
  }

  private joinChatrooms(chatrooms: IChatroom[], socket: ISocket) {
    chatrooms.forEach((c) => {
      socket.join(c._id!.toString());
    });
  }

  public async sendOfflineStatus(socket: ISocket) {
    const chatrooms = await this.chatService.getUsersChatroomIds(
      socket.localData.user.id
    );
    this.sendOnlineOrOfflineStatus(chatrooms, socket, false);
  }

  private sendOnlineOrOfflineStatus(
    chatrooms: IChatroom[],
    socket: ISocket,
    isOnline: boolean
  ) {
    chatrooms.forEach((c) => {
      this.socketPublisher.publish({
        namespace: CHAT_NAMESPACE,
        room: c._id!.toString(),
        payload: {
          userId: socket.localData.user.id,
          chatroomId: c._id!.toString(),
        },
        topic: isOnline ? "event://become-online" : "event://become-offline",
      });
    });
  }

  private sendChatroomStatuses(chatrooms: IChatroom[], socket: ISocket) {
    const usersInChatrooms = [
      ...new Set(
        [].concat.apply(
          [],
          chatrooms.map((c) => c.participants.map((p) => p.userId.toString()))
        )
      ),
    ].filter((u) => u !== socket.localData.user.id) as string[];
    const onlineUserIds = this.socketService.findOnlineUserIds(
      CHAT_NAMESPACE,
      usersInChatrooms
    );

    const onlineStatuses: {
      userId: string;
      chatroomId: string;
    }[] = [];

    chatrooms.forEach((c) => {
      c.participants.forEach((p) => {
        const isOnline = onlineUserIds.some((u) => p.userId.toString() === u);

        if (isOnline) {
          onlineStatuses.push({
            chatroomId: c._id!.toString(),
            userId: p.userId.toString(),
          });
        }
      });
    });

    socket.emit("event://online-statuses", onlineStatuses);
  }

  public async sendMessage(socket: ISocket, message: ChatroomMessage) {
    const affectedUsers = await this.chatService.createMessage(
      message.chatroomId,
      message.message,
      socket.localData.user.id
    );

    if (!affectedUsers) {
      logger.error("Send chat: no affected users error!");
      return;
    }

    this.pushService.sendPushToMultipleUsers(affectedUsers, {
      sender: socket.localData.user,
      message: message.message,
      type: "chat",
    });

    this.mobilePushService.sendMobilePushToMultipleUsers(affectedUsers, {
      notification: {
        title: socket.localData.user.name,
        body: message.message,
        tag: "chat",
      },
      data: {
        type: "chat",
        chatroomId: message.chatroomId,
      },
    });

    const socketMessageGeneral = {
      namespace: CHAT_NAMESPACE,
      room: message.chatroomId,
      payload: {
        chatroomId: message.chatroomId,
        message: {
          sender: socket.localData.user,
          content: message.message,
          createdAt: new Date(),
        },
      },
      topic: "event://get-message",
    };

    this.socketPublisher.publish(socketMessageGeneral);
    this.socketPublisher.publish({
      ...socketMessageGeneral,
      topic: "event://get-message/" + message.chatroomId,
    });
  }

  public async sendChatroomRead(socket: ISocket, chatroomId: string) {
    const isRead = await this.chatService.readChatroom(
      chatroomId,
      socket.localData.user.id
    );

    if (isRead) {
      this.socketPublisher.publish({
        namespace: CHAT_NAMESPACE,
        room: chatroomId,
        payload: {
          chatroomId,
          userId: socket.localData.user.id,
        },
        topic: "event://get-chatroom-read",
      });
    }
  }

  public async sendChatroomTyping(
    socket: ISocket,
    chatroomId: string,
    typing: boolean
  ) {
    const isParticipant = await this.chatService.isUserParticipantInChatroom(
      chatroomId,
      socket.localData.user.id
    );

    if (isParticipant) {
      this.socketPublisher.publish({
        namespace: CHAT_NAMESPACE,
        room: chatroomId,
        payload: {
          chatroomId,
          userId: socket.localData.user.id,
          typing,
        },
        topic: "event://get-chatroom-typing",
      });
    }
  }
}
