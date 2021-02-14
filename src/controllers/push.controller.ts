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
import { MobilePushService } from "../services/mobile-push.service";
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

export class SubscribeToMobilePushRequest {
  @IsDefined()
  public registrationToken!: string;
}

@controller("/push")
export class PushController implements interfaces.Controller {
  constructor(
    @inject(TYPES.PushService)
    private pushService: PushService,
    @inject(TYPES.MobilePushService)
    private mobilePushService: MobilePushService
  ) {}

  @httpPost("/subscribe", isAuth, validation(SubscribeToPushRequest))
  public async subscribeToWebNotifications(
    @request() req: IRequest,
    @requestBody() body: SubscribeToPushRequest
  ): Promise<void> {
    await this.pushService.saveSubscriptionForUser(req.userId, body);
  }

  @httpPost(
    "/subscribe-mobile",
    isAuth,
    validation(SubscribeToMobilePushRequest)
  )
  public async subscribeToMobileNotifications(
    @request() req: IRequest,
    @requestBody() body: SubscribeToMobilePushRequest
  ): Promise<{ success: true }> {
    await this.mobilePushService.saveRegistrationTokenForUser(req.userId, body);
    return { success: true };
  }
}
