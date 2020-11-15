import { injectable } from "inversify";
import User, { IUser } from "../db/models/user.model";
import { logger } from "../utils/logger";
import { UserExtendedRef } from "../db/models/user.extendedRef";

@injectable()
export class UserUtilsService {
  public async getUserById(id: string): Promise<IUser | null> {
    try {
      return await User.findOne({ _id: id }).exec();
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  public async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email }).exec();
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  public async userIdToUserExtendedRef(
    userId: string
  ): Promise<UserExtendedRef | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    return UserExtendedRef.fromUser(user);
  }

  public async userIdsToUserExtendedRefs(
    userIds: string[]
  ): Promise<UserExtendedRef[]> {
    return (
      await Promise.all(
        userIds.map(async (u) => this.userIdToUserExtendedRef(u))
      )
    ).filter((u) => u != null) as UserExtendedRef[];
  }
}
