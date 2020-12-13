import { inject } from "inversify";
import {
  controller,
  interfaces,
  request,
  httpGet,
  httpPost,
  requestParam,
  queryParam,
  httpDelete,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { isAuth } from "../middlewares";
import { UserService } from "../services/user.service";
import { IRequest } from "../types/api";
import multer from "multer";
import { CommonError } from "../errors/common.error";
import { UserProfileDto, FriendStatus } from "../dto/user/userProfile.dto";
import { UserExcerptDto } from "../dto/user/authUser.dto";
import { FriendRequestDto } from "../dto/user/friendRequest.dto";
import { FriendService } from "../services/friend.service";

const upload = multer({ storage: multer.memoryStorage() });

@controller("/user")
export class UserController implements interfaces.Controller {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.FriendService) private friendService: FriendService
  ) {}

  @httpGet("/search", isAuth)
  public searchUsers(@queryParam("q") q: string): Promise<UserExcerptDto[]> {
    return this.userService.searchUsers(q);
  }

  @httpPost("/upload-profile-picture", isAuth, upload.single("profile-picture"))
  public async uploadProfilePicture(@request() req: IRequest): Promise<void> {
    if (req.file) {
      await this.userService.uploadProfilePicture(req.userId, req.file);
    } else {
      throw CommonError.VALIDATION_ERROR;
    }
  }

  @httpPost("/send-friend-request/:userId", isAuth)
  public async sendFriendRequest(
    @requestParam("userId") userId: string,
    @request() req: IRequest
  ): Promise<{ newStatus: FriendStatus }> {
    return await this.friendService.sendFriendRequest(req.userId, userId);
  }

  @httpDelete("/cancel-friend-request/:userId", isAuth)
  public async cancelFriendRequest(
    @requestParam("userId") userId: string,
    @request() req: IRequest
  ): Promise<void> {
    await this.friendService.cancelFriendRequest(req.userId, userId);
  }

  @httpPost("/accept-friend-request/:userId", isAuth)
  public async acceptFriendRequest(
    @requestParam("userId") userId: string,
    @request() req: IRequest
  ): Promise<void> {
    await this.friendService.acceptFriendRequest(req.userId, userId);
  }

  @httpDelete("/decline-friend-request/:userId", isAuth)
  public async declineFriendRequest(
    @requestParam("userId") userId: string,
    @request() req: IRequest
  ): Promise<void> {
    await this.friendService.declineFriendRequest(req.userId, userId);
  }

  @httpDelete("/remove-friendship/:userId", isAuth)
  public async removeFriendship(
    @requestParam("userId") userId: string,
    @request() req: IRequest
  ): Promise<void> {
    await this.friendService.removeFriendship(req.userId, userId);
  }

  @httpGet("/friend-requests", isAuth)
  public getMyFriendRequests(
    @request() req: IRequest
  ): Promise<FriendRequestDto[]> {
    return this.friendService.getFriendRequests(req.userId);
  }

  @httpGet("/friends", isAuth)
  public getMyFriends(@request() req: IRequest): Promise<UserExcerptDto[]> {
    return this.friendService.getFriends(req.userId);
  }

  @httpGet("/profile", isAuth)
  public myProfile(@request() req: IRequest): Promise<UserProfileDto> {
    return this.userService.getUserProfileById(req.userId, req.userId);
  }

  @httpGet("/:id", isAuth)
  public userProfile(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<UserProfileDto> {
    return this.userService.getUserProfileById(id, req.userId);
  }
}
