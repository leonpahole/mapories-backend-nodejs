import {
  INotification,
  NotificationType,
} from "../db/models/notification.model";
import { UserExcerptDto } from "./user/authUser.dto";

export class NotificationDto {
  id: string;
  createdAt: Date;
  type: NotificationType;
  sender: UserExcerptDto;
  entityId?: string;
  read: boolean;

  public static fromModel(notification: INotification): NotificationDto {
    return {
      id: notification._id!.toString(),
      createdAt: notification.createdAt!,
      type: notification.type,
      sender: UserExcerptDto.fromUserExtendedRef(notification.sender),
      entityId: notification.entityId?.toString(),
      read: notification.read,
    };
  }

  public static fromModels(notifications: INotification[]): NotificationDto[] {
    return notifications.map((p) => this.fromModel(p));
  }
}
