import { IUser } from "../../db/models/user.model";

export class UserProfileDto {
  id: string;
  name: string;
  profilePictureUrl?: string;

  public static fromModel(user: IUser): UserProfileDto {
    return {
      id: user._id!.toString(),
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
    };
  }

  public static fromModels(users: IUser[]): UserProfileDto[] {
    return users.map((u) => UserProfileDto.fromModel(u));
  }
}
