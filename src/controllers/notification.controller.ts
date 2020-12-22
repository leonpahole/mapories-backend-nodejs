import { inject } from "inversify";
import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestParam,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { NotificationDto } from "../dto/notification.dto";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { isAuth } from "../middlewares";
import { NotificationService } from "../services/notification.service";
import { IRequest } from "../types/api";

@controller("/notification")
export class NotificationController implements interfaces.Controller {
  constructor(
    @inject(TYPES.NotificationService)
    private notificationService: NotificationService
  ) {}

  @httpGet("/unreadCount", isAuth)
  public async getUnreadNotificationsCountsForUser(
    @request() req: IRequest
  ): Promise<{ notificationCount: number }> {
    const notificationCount = await this.notificationService.getUnreadNotificationsCountsForUser(
      req.userId
    );

    return { notificationCount };
  }

  @httpGet("/", isAuth)
  public getNotificationsForUser(
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number
  ): Promise<PaginatedResponse<NotificationDto>> {
    return this.notificationService.getNotificationsForUser(
      req.userId,
      pageNum,
      pageSize
    );
  }

  @httpPost("/read/:id", isAuth)
  public readNotification(
    @request() req: IRequest,
    @requestParam("id") id: string
  ): Promise<void> {
    return this.notificationService.markNotificationRead(id, req.userId);
  }
}
