import { injectable } from "inversify";
import webpush from "web-push";
import { SubscribeToPushRequest } from "../controllers/push.controller";
import WebPushSubscription, {
  IWebPushSubscription,
  toSubscription,
} from "../db/models/push-subscription.model";
import { logger } from "../utils/logger";

webpush.setVapidDetails(
  `mailto:${process.env.WEBPUSH_VAPID_EMAIL}`,
  process.env.WEBPUSH_VAPID_PUBLIC_KEY,
  process.env.WEBPUSH_VAPID_PRIVATE_KEY
);

@injectable()
export class PushService {
  constructor() {}

  private async getSubscriptionsForUser(
    userId: string
  ): Promise<IWebPushSubscription[]> {
    return WebPushSubscription.find({
      user: userId,
    });
  }

  public async saveSubscriptionForUser(
    userId: string,
    request: SubscribeToPushRequest
  ): Promise<void> {
    await WebPushSubscription.create({
      user: userId,
      endpoint: request.endpoint,
      keys: {
        auth: request.keys.auth,
        p256dh: request.keys.p256dh,
      },
    });
  }

  public async sendPush(userId: string, payload: any) {
    try {
      const subscriptions = await this.getSubscriptionsForUser(userId);

      await Promise.all(
        subscriptions.map((s) => {
          const webPushSubscription = toSubscription(s);
          return webpush.sendNotification(
            webPushSubscription,
            JSON.stringify(payload)
          );
        })
      );
    } catch (e) {
      logger.error("Web push error");
      logger.error(e);
    }
  }

  public async sendPushToMultipleUsers(userIds: string[], payload: any) {
    await Promise.all(userIds.map((u) => this.sendPush(u, payload)));
  }
}
