import { inject } from "inversify";
import {
  controller,
  interfaces,
  request,
  httpGet,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { IUser } from "../db/models/user.model";
import { isAuth } from "../middlewares";
import { UserService } from "../services/user.service";
import { IRequest } from "../types/api";

@controller("/user")
export class UserController implements interfaces.Controller {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}

  @httpGet("/me", isAuth)
  public register(@request() req: IRequest): Promise<IUser | null> {
    return this.userService.getUserById(req.session.userId);
  }
}
