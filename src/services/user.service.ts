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

  public async searchUsers(q: string): Promise<UserExcerptDto[]> {
    const $regex = new RegExp(escapeStringRegexp(q), "i");
    const users = await User.find({ name: { $regex } });
    return UserExcerptDto.fromModels(users);
  }
}
