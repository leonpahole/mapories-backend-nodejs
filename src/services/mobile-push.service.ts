import { injectable } from "inversify";
import { admin } from "../boot/initializeFirebase";
import { SubscribeToMobilePushRequest } from "../controllers/push.controller";
import User from "../db/models/user.model";
import { logger } from "../utils/logger";

@injectable()
export class MobilePushService {
  constructor() {}

  private async getRegistrationTokensForUser(
    userId: string
  ): Promise<string[]> {
    const user = await User.findOne({
      _id: userId,
    });

    if (user) {
      return user.fcmRegistrationTokens;
    }

    return [];
  }

  private async removeRegistrationTokensForUser(
    userId: string,
    tokens: string[]
  ): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $pull: { fcmRegistrationTokens: { $in: tokens } },
      }
    );
  }

  public async saveRegistrationTokenForUser(
    userId: string,
    request: SubscribeToMobilePushRequest
  ): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $addToSet: { fcmRegistrationTokens: request.registrationToken },
      }
    );
  }

  public async sendMobilePush(
    userId: string,
    payload: admin.messaging.MessagingPayload,
    options: admin.messaging.MessagingOptions = {
      timeToLive: 60 * 60 * 24,
      priority: "high",
    }
  ) {
    try {
      const registrationTokens = await this.getRegistrationTokensForUser(
        userId
      );

      if (registrationTokens.length === 0) {
        return;
      }

      const response = await admin
        .messaging()
        .sendToDevice(registrationTokens, payload, options);
      const tokensToRemoveDueToExpiration: string[] = [];

      response.results.forEach((result, index) => {
        if (result.error) {
          logger.error(
            "Failed to send mobile push to ",
            registrationTokens[index],
            ":",
            result.error
          );
          if (
            result.error.code === "messaging/invalid-registration-token" ||
            result.error.code === "messaging/registration-token-not-registered"
          ) {
            tokensToRemoveDueToExpiration.push(registrationTokens[index]);
          }
        }
      });

      await this.removeRegistrationTokensForUser(
        userId,
        tokensToRemoveDueToExpiration
      );
    } catch (e) {
      logger.error("Mobile push error");
      logger.error(e);
    }
  }

  public async sendMobilePushToMultipleUsers(
    userIds: string[],
    payload: admin.messaging.MessagingPayload,
    options?: admin.messaging.MessagingOptions
  ) {
    await Promise.all(
      userIds.map((u) => this.sendMobilePush(u, payload, options))
    );
  }
}
