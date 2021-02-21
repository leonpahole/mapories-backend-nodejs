import { sign, verify } from "jsonwebtoken";
import { injectable, inject } from "inversify";
import { Response, Request } from "express";
import {
  ACCESS_TOKEN_LIFESPAN,
  REFRESH_TOKEN_COOKIE_NAME,
} from "../config/constants";
import { CommonError } from "../errors/common.error";
import { logger } from "../utils/logger";
import TYPES from "../config/types";
import { UserUtilsService } from "./userUtils.service";
import { IUser } from "../db/models/user.model";
import { UserExcerptDto } from "../dto/user/authUser.dto";

@injectable()
export class JwtService {
  constructor(
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService
  ) {}

  public createAccessToken(user: IUser): string {
    return this.createToken(
      { userId: user._id!.toString() },
      process.env.ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_LIFESPAN
    );
  }

  public sendRefreshToken(res: Response, user: IUser): string {
    const token = this.createRefreshToken(user);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/auth/refresh-token",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return token;
  }

  private createRefreshToken(user: IUser): string {
    return this.createToken(
      { userId: user._id!.toString(), tokenVersion: user.refreshTokenVersion },
      process.env.REFRESH_TOKEN_SECRET,
      "7d"
    );
  }

  private createToken(payload: any, secret: string, expiresIn: string): string {
    return sign(payload, secret, {
      expiresIn,
    });
  }

  public async refreshToken(
    req: Request,
    res: Response
  ): Promise<{ token: string; refreshToken: string; user: UserExcerptDto }> {
    const token = req.body.refreshToken
      ? req.body.refreshToken
      : req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (token) {
      try {
        const payload = verify(token, process.env.REFRESH_TOKEN_SECRET) as any;
        const user = await this.userUtilsService.getUserById(payload.userId);

        if (user && user.refreshTokenVersion === payload.tokenVersion) {
          const refreshToken = this.sendRefreshToken(res, user);
          return {
            token: this.createAccessToken(user),
            refreshToken,
            user: UserExcerptDto.fromModel(user),
          };
        }
      } catch (err) {
        logger.error("Refresh verify error");
        logger.error(err);
      }
    }

    throw CommonError.REQUIRES_AUTH_ERROR;
  }
}
