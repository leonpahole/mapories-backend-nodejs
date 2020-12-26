import { IsDefined, IsEmail, MaxLength, MinLength } from "class-validator";
import { Response } from "express";
import { inject } from "inversify";
import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody,
  requestParam,
  response,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { REFRESH_TOKEN_COOKIE_NAME } from "../config/constants";
import { UserExcerptDto } from "../dto/user/authUser.dto";
import { isAuth, validation } from "../middlewares";
import {
  SocialAuthService,
  SocialProviderData,
} from "../services/social-auth.service";
import { UserService } from "../services/user.service";
import { IRequest } from "../types/api";
import { AuthService } from "../services/auth.service";
import { JwtService } from "../services/jwt.service";

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

  public profilePictureUrl?: string;
}

export class VerifyAccountRequest {
  @IsDefined({ message: "Please enter verification token!" })
  public token!: string;
}

export class ResendVerifyAccountEmailRequest {
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

  public profilePictureUrl?: string;
}

export class ChangePasswordRequest {
  @IsDefined({ message: "Please enter new password!" })
  @MinLength(4, { message: "Password should be at least 4 letters long!" })
  @MaxLength(250, { message: "Password shouldn't be longer than 250 letters!" })
  public newPassword: string;
}

class LoginResponse {
  accessToken: string;
  user: UserExcerptDto;
}

class LoginSocialResponse {
  existingUserLoginData: LoginResponse | null;
  nonExistingUser: SocialProviderData | null;
}

export type SocialProvider = "facebook" | "google" | "twitter";

@controller("/auth")
export class AuthController implements interfaces.Controller {
  constructor(
    @inject(TYPES.AuthService) private authService: AuthService,
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.JwtService) private jwtService: JwtService,
    @inject(TYPES.SocialAuthService)
    private socialAuthService: SocialAuthService
  ) {}

  @httpPost("/register", validation(RegisterRequest))
  public register(
    @requestBody() body: RegisterRequest
  ): Promise<UserExcerptDto> {
    return this.authService.register(body);
  }

  @httpPost("/verify-account", validation(VerifyAccountRequest))
  public async verifyAccount(
    @requestBody() body: VerifyAccountRequest
  ): Promise<UserExcerptDto> {
    return this.authService.verifyAccount(body);
  }

  @httpPost(
    "/resend-verify-account-email",
    validation(ResendVerifyAccountEmailRequest)
  )
  public async verifyEmail(
    @requestBody() body: ResendVerifyAccountEmailRequest
  ): Promise<void> {
    this.authService.resendVerifyAccountEmail(body);
  }

  @httpPost("/login", validation(LoginRequest))
  public async login(
    @requestBody() body: LoginRequest,
    @response() res: Response
  ): Promise<LoginResponse> {
    const user = await this.authService.login(body);

    this.jwtService.sendRefreshToken(res, user);
    const accessToken = this.jwtService.createAccessToken(user);

    return {
      accessToken,
      user: UserExcerptDto.fromModel(user),
    };
  }

  @httpPost("/refresh-token")
  public async refreshToken(
    @request() req: IRequest,
    @response() res: Response
  ): Promise<LoginResponse> {
    const { token, user } = await this.jwtService.refreshToken(req, res);

    return {
      accessToken: token,
      user,
    };
  }

  @httpGet("/me", isAuth)
  public myProfile(@request() req: IRequest): Promise<UserExcerptDto | null> {
    return this.userService.getAuthUserById(req.userId);
  }

  @httpPost("/logout", isAuth)
  public async logout(
    @response() res: Response
  ): Promise<{ success: boolean }> {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/auth/refresh-token" });
    return { success: true };
  }

  @httpPost("/forgot-password", validation(ForgotPasswordRequest))
  public async forgotPassword(
    @requestBody() body: ForgotPasswordRequest
  ): Promise<void> {
    await this.authService.sendForgotPasswordMail(body);
  }

  @httpPost("/validate-forgot-password-token", validation(ValidateTokenRequest))
  public async validateForgotPasswordToken(
    @requestBody() body: ValidateTokenRequest
  ): Promise<{ valid: boolean }> {
    const valid = await this.authService.isForgotPasswordTokenValid(body.token);
    return { valid };
  }

  @httpPost("/reset-forgot-password", validation(ResetForgotPasswordRequest))
  public async resetForgotPassword(
    @requestBody() body: ResetForgotPasswordRequest
  ): Promise<void> {
    await this.authService.resetForgotPassword(body);
  }

  // logs in the user if they exist; if they don't, then return back this information (so that FE can call create account page)
  @httpPost("/login-social/:provider", validation(LoginSocialRequest))
  public async loginSocial(
    @requestParam("provider") provider: SocialProvider,
    @requestBody() body: LoginSocialRequest,
    @response() res: Response
  ): Promise<LoginSocialResponse> {
    const response = await this.socialAuthService.loginSocial(provider, body);
    let existingUserLoginData: LoginResponse | null = null;

    if (response.existingUser != null) {
      this.jwtService.sendRefreshToken(res, response.existingUser);
      const accessToken = this.jwtService.createAccessToken(
        response.existingUser
      );

      existingUserLoginData = {
        accessToken,
        user: UserExcerptDto.fromModel(response.existingUser),
      };
    }

    return {
      nonExistingUser: response.nonExistingUser,
      existingUserLoginData,
    };
  }

  @httpPost("/register-social/:provider", validation(RegisterSocialRequest))
  public async registerSocial(
    @requestParam("provider") provider: SocialProvider,
    @requestBody() body: RegisterSocialRequest,
    @response() res: Response
  ): Promise<LoginResponse> {
    const user = await this.socialAuthService.registerSocial(provider, body);

    this.jwtService.sendRefreshToken(res, user);
    const accessToken = this.jwtService.createAccessToken(user);

    return {
      accessToken,
      user: UserExcerptDto.fromModel(user),
    };
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

  @httpPost("/change-password", validation(ChangePasswordRequest))
  public async changePassword(
    @requestBody() body: ChangePasswordRequest,
    @request() req: IRequest
  ): Promise<void> {
    await this.authService.changePassword(req.userId, body);
  }
}
