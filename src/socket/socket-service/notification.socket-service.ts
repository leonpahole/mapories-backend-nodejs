import { injectable } from "inversify";
import { ISocket } from "../../types/socket";

export const NOTIFICATION_NAMESPACE = "/notify";

@injectable()
export class NotificationSocketService {
  constructor() {}

  public async joinNotificationRoom(
    socket: ISocket,
    userId: string
  ): Promise<void> {
    socket.join(userId);
  }
}
