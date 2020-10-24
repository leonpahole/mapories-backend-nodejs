import { inject } from "inversify";
import {
  controller,
  interfaces,
  request,
  httpGet,
  httpPost,
  requestParam,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { isAuth } from "../middlewares";
import { UserService } from "../services/user.service";
import { IRequest } from "../types/api";
import multer from "multer";
import { CommonError } from "../errors/common.error";
import { AuthUserDto } from "../dto/user/authUser.dto";
import { UserProfileDto } from "../dto/user/userProfile.dto";

const upload = multer({ storage: multer.memoryStorage() });

@controller("/user")
export class UserController implements interfaces.Controller {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}

  @httpGet("/profile", isAuth)
  public myProfile(@request() req: IRequest): Promise<UserProfileDto> {
    return this.userService.getUserProfileById(req.session.userId);
  }

  @httpGet("/:id", isAuth)
  public userProfile(@requestParam("id") id: string): Promise<UserProfileDto> {
    return this.userService.getUserProfileById(id);
  }

  @httpPost("/upload-profile-picture", isAuth, upload.single("profile-picture"))
  public async uploadProfilePicture(@request() req: IRequest): Promise<void> {
    if (req.file) {
      await this.userService.uploadProfilePicture(req.session.userId, req.file);
    } else {
      throw CommonError.VALIDATION_ERROR;
    }
  }
}
