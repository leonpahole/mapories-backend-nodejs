import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import TYPES from "../config/types";
import { UserExcerptDto } from "../dto/user/authUser.dto";
import { FriendRequestDto } from "../dto/user/friendRequest.dto";
import { FriendStatus } from "../dto/user/userProfile.dto";
import { CommonError } from "../errors/common.error";
import { UserError } from "../errors/user.error";
import UserList, { UserListIdPrefix } from "../db/models/userList.model";
import { UserExtendedRef } from "../db/models/user.extendedRef";
import { stringToObjectId } from "../utils/strToObjectId";
import { UserUtilsService } from "./userUtils.service";
import { ChatService } from "./chat.service";

@injectable()
export class FriendService {
  constructor(
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService,
    @inject(TYPES.ChatService) private chatService: ChatService
  ) {}

  public async getFriendshipStatus(
    meId: string,
    uId: string,
    includePendingFromThemButDeclined = false
  ): Promise<FriendStatus> {
    let friendStatus = FriendStatus.NONE;

    // todo: possibly optimize this queries?
    if (meId === uId) {
      friendStatus = FriendStatus.IS_ME;
    } else if (await this.areUsersFriends(meId, uId)) {
      friendStatus = FriendStatus.FRIENDS;
    } else if (await this.isUserFriendRequestPendingFromThem(meId, uId)) {
      friendStatus = FriendStatus.PENDING_FROM_THEM;
    } else if (await this.isUserFriendRequestPendingFromMe(meId, uId)) {
      friendStatus = FriendStatus.PENDING_FROM_ME;
    }

    if (includePendingFromThemButDeclined) {
      if (await this.isUserFriendRequestPendingFromThemOnTheirSide(meId, uId)) {
        friendStatus = FriendStatus.PENDING_FROM_THEM_BUT_DECLINED;
      }
    }

    return friendStatus;
  }

  private async areUsersFriends(u1Id: string, u2Id: string) {
    const match = await UserList.findOne(
      {
        _id: `${UserListIdPrefix.FRIEND}_${u1Id}`,
        "users.userId": Types.ObjectId(u2Id),
      },
      { _id: 1 }
    ).exec();

    return match != null;
  }

  private async isUserFriendRequestPendingFromThem(meId: string, uId: string) {
    const match = await UserList.findOne(
      {
        _id: `${UserListIdPrefix.RECEIVED_REQUESTS}_${meId}`,
        "users.userId": Types.ObjectId(uId),
      },
      { _id: 1 }
    ).exec();

    return match != null;
  }

  private async isUserFriendRequestPendingFromThemOnTheirSide(
    meId: string,
    uId: string
  ) {
    const match = await UserList.findOne(
      {
        _id: `${UserListIdPrefix.SENT_REQUESTS}_${uId}`,
        "users.userId": Types.ObjectId(meId),
      },
      { _id: 1 }
    ).exec();

    return match != null;
  }

  private async isUserFriendRequestPendingFromMe(meId: string, uId: string) {
    const match = await UserList.findOne(
      {
        _id: `${UserListIdPrefix.SENT_REQUESTS}_${meId}`,
        "users.userId": Types.ObjectId(uId),
      },
      { _id: 1 }
    ).exec();

    return match != null;
  }

  public async sendFriendRequest(
    requestingUserId: string,
    requestedUserId: string
  ): Promise<{ newStatus: FriendStatus }> {
    const friendshipStatus = await this.getFriendshipStatus(
      requestingUserId,
      requestedUserId,
      true
    );

    if (friendshipStatus === FriendStatus.IS_ME) {
      throw UserError.CANT_BEFRIEND_MYSELF;
    } else if (friendshipStatus === FriendStatus.FRIENDS) {
      throw UserError.USERS_ALREADY_FRIENDS;
    } else if (friendshipStatus === FriendStatus.PENDING_FROM_ME) {
      throw UserError.REQUEST_ALREADY_SENT_FROM_YOU;
    } else if (
      friendshipStatus === FriendStatus.PENDING_FROM_THEM_BUT_DECLINED ||
      friendshipStatus === FriendStatus.PENDING_FROM_THEM
    ) {
      // they sent the request already or they sent it and i declined?
      // let's count this as accept
      await this.acceptFriendRequest(requestingUserId, requestedUserId);
      return { newStatus: FriendStatus.FRIENDS };
    }

    const requestingUserRef = await this.userUtilsService.userIdToUserExtendedRef(
      requestingUserId
    );
    const requestedUserRef = await this.userUtilsService.userIdToUserExtendedRef(
      requestedUserId
    );

    if (!requestingUserRef || !requestedUserRef) {
      throw CommonError.NOT_FOUND;
    }

    // todo: transactional update
    // add requested user id to sent requests of requesting user
    await UserList.updateOne(
      { _id: `${UserListIdPrefix.SENT_REQUESTS}_${requestingUserId}` },
      { $push: { users: requestedUserRef } },
      {
        upsert: true,
      }
    );

    // add requesting user id to received requests of requested user
    await UserList.updateOne(
      { _id: `${UserListIdPrefix.RECEIVED_REQUESTS}_${requestedUserId}` },
      { $push: { users: requestingUserRef } },
      {
        upsert: true,
      }
    );

    return { newStatus: FriendStatus.PENDING_FROM_ME };
  }

  public async cancelFriendRequest(
    cancelingUserId: string,
    requestedUserId: string
  ): Promise<void> {
    await UserList.updateOne(
      { _id: `${UserListIdPrefix.SENT_REQUESTS}_${cancelingUserId}` },
      {
        $pull: {
          users: {
            userId: stringToObjectId(requestedUserId),
          },
        },
      }
    );

    await UserList.updateOne(
      { _id: `${UserListIdPrefix.RECEIVED_REQUESTS}_${requestedUserId}` },
      {
        $pull: {
          users: {
            userId: stringToObjectId(cancelingUserId),
          },
        },
      }
    );
  }

  public async acceptFriendRequest(
    acceptingUserId: string,
    requestingUserId: string
  ): Promise<void> {
    const requestActuallySent = await this.isUserFriendRequestPendingFromThem(
      acceptingUserId,
      requestingUserId
    );

    if (!requestActuallySent) {
      // another option: they sent the request but i declined it some time ago
      const requestSenButDeclinedByMe = await this.isUserFriendRequestPendingFromThemOnTheirSide(
        acceptingUserId,
        requestingUserId
      );

      if (!requestSenButDeclinedByMe) {
        throw UserError.FRIEND_REQUEST_NOT_FOUND;
      }
    }

    await this.cancelFriendRequest(requestingUserId, acceptingUserId);

    const requestingUserRef = await this.userUtilsService.userIdToUserExtendedRef(
      requestingUserId
    );
    const acceptingUserRef = await this.userUtilsService.userIdToUserExtendedRef(
      acceptingUserId
    );

    if (!requestingUserRef || !acceptingUserRef) {
      throw CommonError.NOT_FOUND;
    }

    await this.addFriend(requestingUserId, acceptingUserRef);
    await this.addFriend(acceptingUserId, requestingUserRef);
    await this.chatService.createChatroom(acceptingUserId, {
      participants: [requestingUserId],
    });
  }

  private async addFriend(userId: string, friendRef: UserExtendedRef) {
    await UserList.updateOne(
      { _id: `${UserListIdPrefix.FRIEND}_${userId}` },
      { $push: { users: friendRef } },
      {
        upsert: true,
      }
    );
  }

  public async declineFriendRequest(
    decliningUserId: string,
    requestingUserId: string
  ): Promise<void> {
    // pull only from declining user's side, the other user should have no idea this is happening
    await UserList.updateOne(
      { _id: `${UserListIdPrefix.RECEIVED_REQUESTS}_${decliningUserId}` },
      {
        $pull: {
          users: {
            userId: stringToObjectId(requestingUserId),
          },
        },
      }
    );
  }

  public async removeFriendship(
    removingUserId: string,
    toRemoveUserId: string
  ): Promise<void> {
    await this.removeFriend(removingUserId, toRemoveUserId);
    await this.removeFriend(toRemoveUserId, removingUserId);
  }

  private async removeFriend(userId: string, friendId: string) {
    await UserList.updateOne(
      { _id: `${UserListIdPrefix.FRIEND}_${userId}` },
      {
        $pull: {
          users: {
            userId: stringToObjectId(friendId),
          },
        },
      }
    );
  }

  public async getFriendRequests(userId: string): Promise<FriendRequestDto[]> {
    const userList = await UserList.findOne({
      _id: `${UserListIdPrefix.RECEIVED_REQUESTS}_${userId}`,
    }).exec();

    if (!userList) {
      return [];
    }

    return FriendRequestDto.fromUserExtendedRefs(userList.users);
  }

  public async getFriends(userId: string): Promise<UserExcerptDto[]> {
    const userList = await UserList.findOne({
      _id: `${UserListIdPrefix.FRIEND}_${userId}`,
    }).exec();

    if (!userList) {
      return [];
    }

    return UserExcerptDto.fromUserExtendedRefs(userList.users);
  }

  public async getFriendIds(userId: string): Promise<Types.ObjectId[]> {
    const userList = await UserList.findOne({
      _id: `${UserListIdPrefix.FRIEND}_${userId}`,
    }).exec();

    if (!userList) {
      return [];
    }

    return userList.users.map((u) => Types.ObjectId(u.userId.toString()));
  }
}
