import { inject, injectable } from "inversify";
import TYPES from "../config/types";
import Notification, {
  NotificationType,
} from "../db/models/notification.model";
import { NotificationDto } from "../dto/notification.dto";
import {
  CursorPaginatedResponse,
  PaginatedResponse,
} from "../dto/PaginatedResponse";
import { CommonError } from "../errors/common.error";
import { SocketPublisher } from "../socket/redis/socketPublisher";
import { getNotificationInfo } from "../utils/getNotificationInfo";
import { MobilePushService } from "./mobile-push.service";
import { PushService } from "./push.service";
import { UserUtilsService } from "./userUtils.service";

const NOTIFICATIONS_DEFAULT_PAGE_SIZE = 10;
const NOTIFICATIONS_MAX_PAGE_SIZE = 10;

const NOTIFICATION_NAMESPACE = "/notify";

@injectable()
export class NotificationService {
  constructor(
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService,
    @inject(TYPES.SocketPublisher) private socketPublisher: SocketPublisher,
    @inject(TYPES.PushService) private pushService: PushService,
    @inject(TYPES.MobilePushService)
    private mobilePushService: MobilePushService
  ) {}

  public async getUnreadNotificationsCountsForUser(
    userId: string
  ): Promise<number> {
    return await Notification.find({
      receiver: userId,
      read: false,
    }).count();
  }

  public async getNotificationsForUser(
    userId: string,
    cursor?: number,
    pageSize: number = NOTIFICATIONS_DEFAULT_PAGE_SIZE
  ): Promise<CursorPaginatedResponse<NotificationDto>> {
    pageSize = Math.min(pageSize, NOTIFICATIONS_MAX_PAGE_SIZE);

    const notifications = await Notification.find({
      receiver: userId,
      createdAt: {
        $lte: cursor ? new Date(Number(cursor)) : new Date(),
      },
    })
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    let nextCursor: number | null = null;
    if (notifications.length > pageSize) {
      nextCursor = notifications.pop()!.createdAt!.getTime();
    }

    const notificationDtos = NotificationDto.fromModels(notifications);
    return new CursorPaginatedResponse<NotificationDto>(
      notificationDtos,
      nextCursor
    );
  }

  public async markNotificationRead(
    notificationId: string,
    currentUserId: string
  ): Promise<void> {
    await Notification.updateOne(
      { _id: notificationId, receiver: currentUserId },
      {
        read: true,
      }
    );
  }

  private async createNotification(
    receiverId: string,
    senderId: string,
    type: NotificationType,
    entityId?: string
  ): Promise<void> {
    const sender = await this.userUtilsService.userIdToUserExtendedRef(
      senderId
    );

    if (!sender) {
      throw CommonError.NOT_FOUND;
    }

    const notification = await Notification.create({
      read: false,
      type: type,
      entityId,
      receiver: receiverId,
      sender,
    });

    const notificationDto = NotificationDto.fromModel(notification);

    this.socketPublisher.publish({
      namespace: NOTIFICATION_NAMESPACE,
      room: receiverId,
      payload: notificationDto,
      topic: "event://get-notification",
    });

    this.pushService.sendPush(receiverId, notificationDto);
    const notificationInfo = getNotificationInfo(notificationDto);
    if (notificationInfo) {
      this.mobilePushService.sendMobilePush(receiverId, {
        notification: {
          title: notificationInfo.title,
          body: notificationInfo.message,
          tag: "notification",
        },
      });
    }
  }

  public async createFriendRequestSentNotification(
    receiverId: string,
    senderId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.SENT_FRIEND_REQUEST
    );
  }

  public async createFriendRequestAcceptedNotification(
    receiverId: string,
    senderId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.ACCEPTED_FRIEND_REQUEST
    );
  }

  public async createLikedPostNotification(
    receiverId: string,
    senderId: string,
    postId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.LIKED_YOUR_POST,
      postId
    );
  }

  public async createCommentedPostNotification(
    receiverId: string,
    senderId: string,
    postId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.COMMENTED_ON_YOUR_POST,
      postId
    );
  }

  public async createLikedCommentNotification(
    receiverId: string,
    senderId: string,
    postId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.LIKED_YOUR_COMMENT,
      postId
    );
  }

  public async createRepliedToCommentNotification(
    receiverId: string,
    senderId: string,
    postId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.REPLIED_TO_YOUR_COMMENT,
      postId
    );
  }

  public async createRepliedToCommentYouRepliedToNotification(
    receiverId: string,
    senderId: string,
    postId: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      senderId,
      NotificationType.REPLIED_TO_A_COMMENT_YOU_REPLIED_TO,
      postId
    );
  }
}
