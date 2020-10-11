import { IsDefined, IsEmail, MaxLength, MinLength } from "class-validator";
import { Response } from "express";
import { inject } from "inversify";
import {
  controller,
  httpPost,
  interfaces,
  request,
  requestBody,
  response,
  requestParam,
  queryParam,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { COOKIE_NAME } from "../constants";
import { IUser } from "../db/models/user.model";
import { isAuth, validation } from "../middlewares";
import { UserService } from "../services/user.service";
import { IRequest } from "../types/api";
import { logger } from "../utils/logger";
import {
  SocialAuthService,
  SocialProviderData,
  LoginSocialResponse,
} from "../services/social-auth.service";
import { encode } from "punycode";

export class RegisterRequest {
  @IsDefined({ message: "Please enter your email address!" })
  @IsEmail({}, { message: "Invalid email address!" })
  @MaxLength(250, { message: "Email shouldn't be longer than 250 letters!" })
  public email!: string;

  @IsDefined({ message: "Please enter your name!" })
  @MaxLength(40, { message: "Name shouldn't be longer than 40 letters!" })
  public name!: string;

  @IsDefined({ message: "Please enter your password!" })
  @MinLength(4, { message: "Password should be at least 4 letters long!" })
  @MaxLength(250, { message: "Password shouldn't be longer than 250 letters!" })
  public password: string;
}

export class VerifyAccontRequest {
  @IsDefined({ message: "Please enter verification token!" })
  public token!: string;
}

export class ResendVerifyAccontEmailRequest {
  @IsDefined({ message: "Please enter your email address!" })
  @IsEmail({}, { message: "Invalid email address!" })
  public email!: string;
}

export class ValidateTokenRequest {
  @IsDefined({ message: "Please enter token!" })
  public token!: string;
}

export class LoginRequest {
  @IsDefined({ message: "Please enter your email address!" })
  @IsEmail({}, { message: "Invalid email address!" })
  public email!: string;

  @IsDefined({ message: "Please enter your password!" })
  public password: string;

  public rememberMe: boolean = false;
}

export class ForgotPasswordRequest {
  @IsDefined({ message: "Please enter your email address!" })
  @IsEmail({}, { message: "Invalid email address!" })
  public email!: string;
}

export class ResetForgotPasswordRequest {
  @IsDefined({ message: "Please enter verification token!" })
  public token!: string;

  @IsDefined({ message: "Please enter new password!" })
  @MinLength(4, { message: "Password should be at least 4 letters long!" })
  @MaxLength(250, { message: "Password shouldn't be longer than 250 letters!" })
  public newPassword: string;
}

export class LoginSocialRequest {
  @IsDefined({ message: "Please enter access token!" })
  public accessToken!: string;

  public accessTokenSecret?: string;
}

export class RegisterSocialRequest {
  @IsDefined({ message: "Please enter access token!" })
  public accessToken!: string;

  public accessTokenSecret?: string;

  @MaxLength(40, { message: "Name shouldn't be longer than 40 letters!" })
  public name: string;
}

export type SocialProvider = "facebook" | "google" | "twitter";

@controller("/auth")
export class AuthController implements interfaces.Controller {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.SocialAuthService)
    private socialAuthService: SocialAuthService
  ) {}

  @httpPost("/register", validation(RegisterRequest))
  public register(@requestBody() body: RegisterRequest): Promise<IUser> {
    return this.userService.createUser(body);
  }

  @httpPost("/verify-account", validation(VerifyAccontRequest))
  public async verifyAccount(
    @requestBody() body: VerifyAccontRequest
  ): Promise<IUser> {
    return this.userService.verifyAccount(body);
  }

  @httpPost(
    "/resend-verify-account-email",
    validation(ResendVerifyAccontEmailRequest)
  )
  public async verifyEmail(
    @requestBody() body: ResendVerifyAccontEmailRequest
  ): Promise<void> {
    this.userService.resendVerifyAccountEmail(body);
  }

  @httpPost("/login", validation(LoginRequest))
  public async login(
    @requestBody() body: LoginRequest,
    @request() req: IRequest
  ): Promise<IUser> {
    const user = await this.userService.login(body);

    req.session.userId = user._id!.toString();

    if (!body.rememberMe) {
      req.session.cookie.expires = false;
    }

    return user;
  }

  @httpPost("/logout", isAuth)
  public async logout(
    @request() req: IRequest,
    @response() res: Response
  ): Promise<boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          logger.error(err);
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
  }

  @httpPost("/forgot-password", validation(ForgotPasswordRequest))
  public async forgotPassword(
    @requestBody() body: ForgotPasswordRequest
  ): Promise<void> {
    await this.userService.sendForgotPasswordMail(body);
  }

  @httpPost("/validate-forgot-password-token", validation(ValidateTokenRequest))
  public async validateForgotPasswordToken(
    @requestBody() body: ValidateTokenRequest
  ): Promise<{ valid: boolean }> {
    const valid = await this.userService.isForgotPasswordTokenValid(body.token);
    return { valid };
  }

  @httpPost("/reset-forgot-password", validation(ResetForgotPasswordRequest))
  public async resetForgotPassword(
    @requestBody() body: ResetForgotPasswordRequest
  ): Promise<void> {
    await this.userService.resetForgotPassword(body);
  }

  // logs in the user if they exist; if they don't, then return back this information (so that FE can call create account page)
  @httpPost("/login-social/:provider", validation(LoginSocialRequest))
  public async loginSocial(
    @requestParam("provider") provider: SocialProvider,
    @requestBody() body: LoginSocialRequest,
    @request() req: IRequest
  ): Promise<LoginSocialResponse> {
    const response = await this.socialAuthService.loginSocial(provider, body);

    if (response.existingUser != null) {
      req.session.userId = response.existingUser._id!.toString();
    }

    return response;
  }

  @httpPost("/register-social/:provider", validation(RegisterSocialRequest))
  public async registerSocial(
    @requestParam("provider") provider: SocialProvider,
    @requestBody() body: RegisterSocialRequest,
    @request() req: IRequest
  ): Promise<IUser> {
    const loggedInUser = await this.socialAuthService.registerSocial(
      provider,
      body
    );

    if (loggedInUser != null) {
      req.session.userId = loggedInUser._id!.toString();
    }

    return loggedInUser;
  }

  @httpPost("/twitter/request_token")
  public async getTwitterRequestToken(): Promise<any> {
    return await this.socialAuthService.getTwitterRequestToken();
  }

  @httpPost("/twitter/access_token")
  public async getTwitterAccessToken(
    @queryParam("oauth_verifier") oAuthVerifier: string,
    @queryParam("oauth_token") oAuthToken: string
  ): Promise<any> {
    return await this.socialAuthService.getTwitterAccessToken(
      oAuthVerifier,
      oAuthToken
    );
  }
}
