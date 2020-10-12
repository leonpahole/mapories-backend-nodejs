import { inject } from "inversify";
import {
  controller,
  interfaces,
  request,
  httpGet,
  httpPost,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { IUser } from "../db/models/user.model";
import { isAuth } from "../middlewares";
import { UserService } from "../services/user.service";
import { IRequest } from "../types/api";
import multer from "multer";
import { CommonError } from "../errors/common.error";

const upload = multer({ storage: multer.memoryStorage() });

@controller("/user")
export class UserController implements interfaces.Controller {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}

  @httpGet("/me", isAuth)
  public register(@request() req: IRequest): Promise<IUser | null> {
    return this.userService.getUserById(req.session.userId);
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
