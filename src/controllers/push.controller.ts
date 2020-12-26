import { IsDefined } from "class-validator";
import { inject } from "inversify";
import {
  controller,
  httpPost,
  interfaces,
  request,
  requestBody,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { isAuth, validation } from "../middlewares";
import { PushService } from "../services/push.service";
import { IRequest } from "../types/api";

export class SubscribeToPushRequestKeys {
  @IsDefined()
  public p256dh!: string;

  @IsDefined()
  public auth!: string;
}

export class SubscribeToPushRequest {
  @IsDefined()
  public endpoint!: string;

  @IsDefined()
  public keys!: SubscribeToPushRequestKeys;
}

@controller("/push")
export class PushController implements interfaces.Controller {
  constructor(
    @inject(TYPES.PushService)
    private pushService: PushService
  ) {}

  @httpPost("/subscribe", isAuth, validation(SubscribeToPushRequest))
  public async getUnreadNotificationsCountsForUser(
    @request() req: IRequest,
    @requestBody() body: SubscribeToPushRequest
  ): Promise<void> {
    await this.pushService.saveSubscriptionForUser(req.userId, body);
  }
}
