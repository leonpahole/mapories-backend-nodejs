import { IUser } from "../../db/models/user.model";

export class UserProfileDto {
  id: string;
  name: string;
  profilePictureUrl?: string;
  friendStatus: FriendStatus;

  public static fromModel({
    user,
    friendStatus,
  }: {
    user: IUser;
    friendStatus: FriendStatus;
  }): UserProfileDto {
    return {
      id: user._id!.toString(),
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
      friendStatus,
    };
  }

  public static fromModels(
    users: {
      user: IUser;
      friendStatus: FriendStatus;
    }[]
  ): UserProfileDto[] {
    return users.map((u) => UserProfileDto.fromModel(u));
  }
}

export enum FriendStatus {
  IS_ME = 0,
  NONE = 1,
  PENDING_FROM_ME = 2,
  PENDING_FROM_THEM = 3,
  FRIENDS = 4,
  PENDING_FROM_THEM_BUT_DECLINED = 5,
}
