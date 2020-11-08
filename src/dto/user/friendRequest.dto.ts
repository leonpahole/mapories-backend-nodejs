import { UserExcerptDto } from "./authUser.dto";
import { UserExtendedRef } from "../../db/models/user.extendedRef";

export class FriendRequestDto {
  from: UserExcerptDto;

  public static fromUserExtendedRef(user: UserExtendedRef): FriendRequestDto {
    return {
      from: UserExcerptDto.fromUserExtendedRef(user),
    };
  }

  public static fromUserExtendedRefs(
    users: UserExtendedRef[]
  ): FriendRequestDto[] {
    return users.map((u) => FriendRequestDto.fromUserExtendedRef(u));
  }
}
