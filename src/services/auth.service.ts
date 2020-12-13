import { injectable, inject } from "inversify";
import User, { IUser } from "../db/models/user.model";
import { logger } from "../utils/logger";
import {
  RegisterRequest,
  LoginRequest,
  VerifyAccountRequest,
  ForgotPasswordRequest,
  ResetForgotPasswordRequest,
  ResendVerifyAccountEmailRequest,
  ChangePasswordRequest,
} from "../controllers/auth.controller";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import {
  FORGOT_PASSWORD_LINK_EXPIRY_MS,
  FORGOT_PASSWORD_LINK_EXPIRY_HOURS,
} from "../config/constants";
import TYPES from "../config/types";
import { MailService } from "./mail.service";
import { UserError } from "../errors/user.error";
import { CommonError } from "../errors/common.error";
import { UserExcerptDto } from "../dto/user/authUser.dto";
import { UserUtilsService } from "./userUtils.service";

@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.MailService) private mailService: MailService,
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService
  ) {}

  private async createUser(
    data: RegisterRequest,
    isSocial: boolean = false
  ): Promise<IUser> {
    let hashedPassword = undefined;
    if (!isSocial) {
      hashedPassword = await argon2.hash(data.password);
    }

    let user: IUser | null = null;

    try {
      user = await User.create({
        ...data,
        password: hashedPassword,
        isVerified: isSocial,
        refreshTokenVersion: 0,
      });
    } catch (e) {
      logger.error("Create user error %o", e);

      if (e.code === 11000) {
        throw UserError.EMAIL_EXISTS;
      }

      throw CommonError.UNKNOWN_ERROR;
    }

    if (isSocial) {
      await this.sendWelcomeMail(user);
    } else {
      await this.sendVerifyMail(user);
    }

    return user;
  }

  public async register(data: RegisterRequest): Promise<UserExcerptDto> {
    const user = await this.createUser(data);
    return UserExcerptDto.fromModel(user);
  }

  public async registerSocial(
    name: string,
    email: string,
    profilePictureUrl: string | undefined
  ): Promise<IUser> {
    return await this.createUser(
      {
        name,
        email,
        profilePictureUrl,
        password: "",
      },
      true
    );
  }

  private async sendVerifyMail(user: IUser): Promise<boolean> {
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET
    );

    return await this.mailService.sendVerifyMail(user.email, {
      link: `${process.env.FRONTEND_URL}/verify-email/${token}`,
      name: user.name,
    });
  }

  private async sendWelcomeMail(user: IUser): Promise<boolean> {
    return await this.mailService.sendWelcomeMail(user.email, {
      name: user.name,
    });
  }

  public async login(data: LoginRequest): Promise<IUser> {
    const user = await this.userUtilsService.getUserByEmail(data.email);
    if (!user) {
      throw UserError.WRONG_LOGIN_CREDENTIALS;
    }

    if (user.password == null) {
      throw UserError.WRONG_LOGIN_CREDENTIALS;
    }

    const valid = await argon2.verify(user.password, data.password);
    if (!valid) {
      throw UserError.WRONG_LOGIN_CREDENTIALS;
    }

    if (!user.isVerified) {
      throw UserError.ACCOUNT_NOT_VERIFIED;
    }

    return user;
  }

  public async verifyAccount(
    data: VerifyAccountRequest
  ): Promise<UserExcerptDto> {
    const user = await this.getUserFromTokenPayload(data.token);

    if (user.isVerified) {
      return UserExcerptDto.fromModel(user);
    }

    await User.updateOne({ _id: user._id }, { isVerified: true });

    user.isVerified = true;

    await this.sendWelcomeMail(user);

    return UserExcerptDto.fromModel(user);
  }

  public async resendVerifyAccountEmail(
    body: ResendVerifyAccountEmailRequest
  ): Promise<void> {
    const user = await this.userUtilsService.getUserByEmail(body.email);
    if (!user) {
      return;
    }

    if (user.isVerified) {
      return;
    }

    this.sendVerifyMail(user);
  }

  private getTokenPayload(token: string): any {
    let payload: any | null = null;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      logger.error("Verify token error");
      logger.error(e);
      throw UserError.INVALID_TOKEN;
    }

    if (!payload || !payload.id) {
      throw UserError.INVALID_TOKEN;
    }

    return payload;
  }

  private async getUserFromTokenPayload(token: string): Promise<IUser> {
    let payload: any = this.getTokenPayload(token);

    const userId: string = payload.id;

    const user = await this.userUtilsService.getUserById(userId);

    if (!user) {
      throw CommonError.NOT_FOUND;
    }

    return user;
  }

  public async sendForgotPasswordMail(
    data: ForgotPasswordRequest
  ): Promise<void> {
    const user = await this.userUtilsService.getUserByEmail(data.email);

    if (!user) {
      return;
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: FORGOT_PASSWORD_LINK_EXPIRY_MS,
      }
    );

    const sendMailResult = await this.mailService.sendForgotPasswordMail(
      user.email,
      {
        name: user.name,
        expiryTimeHours: FORGOT_PASSWORD_LINK_EXPIRY_HOURS,
        link: `${process.env.FRONTEND_URL}/reset-password/${token}`,
      }
    );

    if (!sendMailResult) {
      throw UserError.FORGOT_PASSWORD_EMAIL_SENDING_ERROR;
    }

    return;
  }

  public async isForgotPasswordTokenValid(token: string): Promise<boolean> {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return false;
    }

    return true;
  }

  public async resetForgotPassword(
    data: ResetForgotPasswordRequest
  ): Promise<void> {
    const user = await this.getUserFromTokenPayload(data.token);
    await this.changePassword(user._id!.toString(), {
      newPassword: data.newPassword,
    });
  }

  public async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<void> {
    const hashedPassword = await argon2.hash(data.newPassword);
    await User.updateOne({ _id: userId }, { password: hashedPassword });
  }
}
