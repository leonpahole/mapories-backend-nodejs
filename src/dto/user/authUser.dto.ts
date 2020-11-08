import { IUser } from "../../db/models/user.model";
import { UserExtendedRef } from "../../db/models/user.extendedRef";

export class UserExcerptDto {
  id: string;
  name: string;
  profilePictureUrl?: string;

  public static fromModel(user: IUser): UserExcerptDto {
    return {
      id: user._id!.toString(),
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
    };
  }

  public static fromModels(users: IUser[]): UserExcerptDto[] {
    return users.map((u) => this.fromModel(u));
  }

  public static fromUserExtendedRef(user: UserExtendedRef): UserExcerptDto {
    return {
      id: user.userId!.toString(),
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
    };
  }

  public static fromUserExtendedRefs(
    users: UserExtendedRef[]
  ): UserExcerptDto[] {
    return users.map((u) => this.fromUserExtendedRef(u));
  }
}
