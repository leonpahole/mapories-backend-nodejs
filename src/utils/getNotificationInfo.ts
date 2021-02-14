import { NotificationType } from "../db/models/notification.model";
import { NotificationDto } from "../dto/notification.dto";

interface NotificationInfo {
  title: string;
  message: string;
}

export const getNotificationInfo = (
  notification: NotificationDto
): NotificationInfo | null => {
  let notificationInfo: NotificationInfo | null = null;

  if (notification.type === NotificationType.ACCEPTED_FRIEND_REQUEST) {
    notificationInfo = {
      title: "Friend request accepted!",
      message: "has accepted your friend request.",
    };
  } else if (notification.type === NotificationType.SENT_FRIEND_REQUEST) {
    notificationInfo = {
      title: "New friend request!",
      message: "has sent you a friend request.",
    };
  } else if (notification.entityId) {
    if (notification.type === NotificationType.LIKED_YOUR_COMMENT) {
      notificationInfo = {
        title: "New like on comment!",
        message: "has liked your comment on a post.",
      };
    } else if (notification.type === NotificationType.LIKED_YOUR_POST) {
      notificationInfo = {
        title: "New like on post!",
        message: "has liked your post.",
      };
    } else if (notification.type === NotificationType.COMMENTED_ON_YOUR_POST) {
      notificationInfo = {
        title: "New comment on post!",
        message: "has commented your post.",
      };
    } else if (notification.type === NotificationType.REPLIED_TO_YOUR_COMMENT) {
      notificationInfo = {
        title: "New reply!",
        message: "has replied to your comment on a post.",
      };
    } else if (
      notification.type === NotificationType.REPLIED_TO_A_COMMENT_YOU_REPLIED_TO
    ) {
      notificationInfo = {
        title: "New reply!",
        message: "has replied to a comment your commented on a post.",
      };
    }
  }

  if (notificationInfo) {
    notificationInfo.message = `${notification.sender.name} ${notificationInfo.message}`;
  }

  return notificationInfo;
};
