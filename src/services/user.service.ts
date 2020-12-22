import escapeStringRegexp from "escape-string-regexp";
import { inject, injectable } from "inversify";
import TYPES from "../config/types";
import User from "../db/models/user.model";
import { UserExcerptDto } from "../dto/user/authUser.dto";
import { UserProfileDto } from "../dto/user/userProfile.dto";
import { CommonError } from "../errors/common.error";
import { ImageService } from "./image.service";
import { UserUtilsService } from "./userUtils.service";
import { FriendService } from "./friend.service";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { stringToObjectId } from "../utils/strToObjectId";
import { verify } from "jsonwebtoken";

const USERS_DEFAULT_PAGE_SIZE = 10;
const USERS_MAX_PAGE_SIZE = 50;

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService,
    @inject(TYPES.FriendService) private friendService: FriendService,
    @inject(TYPES.ImageService) private imageService: ImageService
  ) {}

  public async uploadProfilePicture(userId: string, file: Express.Multer.File) {
    const profilePicturePath = await this.imageService.uploadAndCompressProfileImage(
      file
    );
    await User.updateOne(
      { _id: userId },
      { profilePictureUrl: profilePicturePath }
    );
  }

  public async getAuthUserById(id: string): Promise<UserExcerptDto | null> {
    const user = await this.userUtilsService.getUserById(id);
    return user ? UserExcerptDto.fromModel(user) : null;
  }

  public async getAuthUserByJwt(token: string): Promise<UserExcerptDto | null> {
    try {
      const payload = verify(token, process.env.ACCESS_TOKEN_SECRET) as any;
      if (!payload || !payload.userId) {
        return null;
      }

      return await this.getAuthUserById(payload.userId);
    } catch (e) {
      return null;
    }
  }

  public async getUserProfileById(
    userId: string,
    currentUserId: string
  ): Promise<UserProfileDto> {
    const user = await this.userUtilsService.getUserById(userId);
    if (!user) {
      throw CommonError.NOT_FOUND;
    }

    const friendStatus = await this.friendService.getFriendshipStatus(
      currentUserId,
      userId
    );

    return UserProfileDto.fromModel({ user, friendStatus });
  }

  public async searchUsers(
    q: string,
    pageNumber: number,
    pageSize: number = USERS_DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<UserExcerptDto>> {
    pageSize = Math.min(pageSize, USERS_MAX_PAGE_SIZE);

    const $regex = new RegExp(escapeStringRegexp(q), "i");
    const users = await User.find({ name: { $regex } })
      .sort({
        name: 1,
      })
      .skip(pageNumber * pageSize)
      .limit(pageSize + 1);

    const moreAvailable = users.length > pageSize;
    if (moreAvailable) {
      users.pop();
    }

    const userDtos = UserExcerptDto.fromModels(users);
    return new PaginatedResponse<UserExcerptDto>(userDtos, moreAvailable);
  }

  public async deleteProfile(userId: string) {
    await User.deleteOne({ id: stringToObjectId(userId) });
  }
}
