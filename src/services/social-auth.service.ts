import { injectable, inject } from "inversify";
import {
  SocialProvider,
  LoginSocialRequest,
  RegisterSocialRequest,
} from "../controllers/auth.controller";
import { SocialAuthError } from "../errors/social-auth.error";
import TYPES from "../config/types";
import { UserService } from "./user.service";
import { IUser } from "../db/models/user.model";
import axios from "axios";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { v1 } from "uuid";
import { ImageService } from "./image.service";
import { AuthUserDto } from "../dto/user/authUser.dto";

export interface SocialProviderData {
  name: string;
  email: string;
  profilePictureUrl?: string;
}

interface FacebookUserData {
  id: string;
  name: string;
  email: string;
  picture: {
    data: {
      url: string;
    };
  };
}

interface GoogleUserData {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface TwitterUserData {
  id_str: string;
  name: string;
  email: string;
  profile_image_url_https: string;
}

export interface LoginSocialResponse {
  existingUser: IUser | null;
  nonExistingUser: SocialProviderData | null;
}

const FB_API_URL = "https://graph.facebook.com";
const GOOGLE_API_URL = "https://www.googleapis.com/oauth2/v1";
const TWITTER_API_URL = "https://api.twitter.com";

@injectable()
export class SocialAuthService {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.ImageService) private imageService: ImageService
  ) {}

  public async loginSocial(
    provider: SocialProvider,
    request: LoginSocialRequest
  ): Promise<LoginSocialResponse> {
    const providerData = await this.getSocialData(
      provider,
      request.accessToken,
      request.accessTokenSecret
    );

    const existingUser = await this.userService.getUserByEmail(
      providerData.email
    );

    const userAlreadyExists = existingUser != null;

    if (userAlreadyExists) {
      // todo: add social link into the database if it doesn't exist yet
    }

    return {
      existingUser,
      nonExistingUser: userAlreadyExists ? null : providerData,
    };
  }

  public async registerSocial(
    provider: SocialProvider,
    request: RegisterSocialRequest
  ): Promise<AuthUserDto> {
    const providerData = await this.getSocialData(
      provider,
      request.accessToken,
      request.accessTokenSecret
    );

    const existingUser = await this.userService.getUserByEmail(
      providerData.email
    );

    if (existingUser) {
      // todo: add social link into the database if it doesn't exist yet
      return AuthUserDto.fromModel(existingUser);
    }

    let profilePicPath: string | undefined = undefined;

    if (request.profilePictureUrl) {
      profilePicPath = await this.imageService.downloadAndCompressProfileImage(
        request.profilePictureUrl
      );
    }

    return await this.userService.createUser(
      {
        name: request.name,
        email: providerData.email,
        password: "",
        profilePictureUrl: profilePicPath,
      },
      true
    );
  }

  private async getSocialData(
    provider: SocialProvider,
    accessToken: string,
    accessTokenSecret?: string
  ): Promise<SocialProviderData> {
    if (provider === "facebook") {
      return await this.getFacebookSocialData(accessToken);
    } else if (provider === "google") {
      return await this.getGoogleSocialData(accessToken);
    } else if (provider === "twitter" && accessTokenSecret != null) {
      return await this.getTwitterSocialData(accessToken, accessTokenSecret);
    }

    throw SocialAuthError.INVALID_SOCIAL_PROVIDER;
  }

  private async getFacebookSocialData(
    accessToken: string
  ): Promise<SocialProviderData> {
    try {
      const res = await axios.get<FacebookUserData>(
        `${FB_API_URL}/me?fields=id,name,email,picture`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = res.data;

      return {
        email: data.email,
        name: data.name,
        profilePictureUrl: data.picture.data.url,
      };
    } catch (e) {
      logger.error("FB error");
      logger.error(e);
      throw SocialAuthError.SOCIAL_PROFILE_REQUEST_FAILURE;
    }
  }

  private async getGoogleSocialData(
    accessToken: string
  ): Promise<SocialProviderData> {
    try {
      const res = await axios.get<GoogleUserData>(
        `${GOOGLE_API_URL}/userinfo?alt=json`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = res.data;

      return {
        email: data.email,
        name: data.name,
        profilePictureUrl: data.picture,
      };
    } catch (e) {
      logger.error("Google error");
      logger.error(e);
      throw SocialAuthError.SOCIAL_PROFILE_REQUEST_FAILURE;
    }
  }

  private async getTwitterSocialData(
    accessToken: string,
    accessTokenSecret: string
  ): Promise<SocialProviderData> {
    const baseUrl = `${TWITTER_API_URL}/1.1/account/verify_credentials.json`;

    try {
      const res = await axios.get<TwitterUserData>(
        `${baseUrl}?include_email=true`,
        {
          headers: {
            Authorization: this.generateTwitterOAuthHeader(
              "GET",
              baseUrl,
              undefined,
              accessToken,
              accessTokenSecret,
              {
                include_email: "true",
              }
            ),
          },
        }
      );

      const data = res.data;

      return {
        email: data.email,
        name: data.name,
        profilePictureUrl: data.profile_image_url_https,
      };
    } catch (e) {
      logger.error("Google error");
      logger.error(e);
      throw SocialAuthError.SOCIAL_PROFILE_REQUEST_FAILURE;
    }
  }

  public async getTwitterRequestToken(): Promise<any> {
    const baseUrl = `${TWITTER_API_URL}/oauth/request_token`;

    try {
      const res = await axios.post<string>(
        baseUrl,
        {},
        {
          headers: {
            Authorization: this.generateTwitterOAuthHeader("POST", baseUrl),
          },
        }
      );

      const data = res.data;

      const jsonStr = `{ "${data
        .replace(/&/g, '", "')
        .replace(/=/g, '": "')}" }`;
      return JSON.parse(jsonStr);
    } catch (e) {
      throw SocialAuthError.TWITTER_REQUEST_TOKEN_FAILURE;
    }
  }

  public async getTwitterAccessToken(
    oAuthVerifier: string,
    oAuthToken: string
  ): Promise<any> {
    const baseUrl = `${TWITTER_API_URL}/oauth/access_token`;

    try {
      const res = await axios.post<string>(
        baseUrl,
        {},
        {
          headers: {
            Authorization: this.generateTwitterOAuthHeader(
              "POST",
              baseUrl,
              oAuthVerifier,
              oAuthToken
            ),
          },
        }
      );

      const data = res.data;

      const jsonStr = `{ "${data
        .replace(/&/g, '", "')
        .replace(/=/g, '": "')}" }`;
      return JSON.parse(jsonStr);
    } catch (e) {
      throw SocialAuthError.TWITTER_REQUEST_TOKEN_FAILURE;
    }
  }

  private generateTwitterOAuthHeader(
    method: "POST" | "GET",
    baseUrl: string,
    oAuthVerifier?: string,
    oAuthToken?: string,
    oAuthTokenSecret?: string,
    additionalParams?: any
  ): string {
    const oAuthNonce = v1();
    const oAuthTimestamp = Math.floor(Date.now() / 1000).toString();

    const params: Record<string, string | undefined> = {
      oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY,
      oauth_signature_method: "HMAC-SHA1",
      oauth_callback: "http://localhost:3000/twitter-callback",
      oauth_timestamp: oAuthTimestamp,
      oauth_nonce: oAuthNonce,
      oauth_version: "1.0",
      oauth_verifier: oAuthVerifier,
      oauth_token: oAuthToken,
      ...additionalParams,
    };

    let ordered: Record<string, string> = {};
    Object.keys(params)
      .sort()
      .forEach(function (key) {
        if (params[key] != null) {
          ordered[key] = params[key]!;
        }
      });

    let encodedParameters = "";
    for (let k in ordered) {
      const encodedValue = encodeURIComponent(ordered[k]);
      const encodedKey = encodeURIComponent(k);
      if (encodedParameters === "") {
        encodedParameters += `${encodedKey}=${encodedValue}`;
      } else {
        encodedParameters += `&${encodedKey}=${encodedValue}`;
      }
    }

    const encodedUrl = encodeURIComponent(baseUrl);
    encodedParameters = encodeURIComponent(encodedParameters);

    const signatureBaseString = `${method}&${encodedUrl}&${encodedParameters}`;

    const signingKey = `${process.env.TWITTER_CONSUMER_SECRET}&${
      oAuthTokenSecret ? oAuthTokenSecret : ""
    }`;

    const oAuthSignature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBaseString)
      .digest()
      .toString("base64");

    const encodedOAuthSignature = encodeURIComponent(oAuthSignature);

    const authorizationHeader = `OAuth oauth_consumer_key="${
      process.env.TWITTER_CONSUMER_KEY
    }",${
      oAuthToken ? `oauth_token=${oAuthToken},` : ""
    }oauth_signature_method="HMAC-SHA1",oauth_timestamp="${oAuthTimestamp}",oauth_nonce="${oAuthNonce}",oauth_version="1.0",oauth_callback="${encodeURIComponent(
      "http://localhost:3000/twitter-callback"
    )}",${
      oAuthVerifier ? `oauth_verifier="${oAuthVerifier}",` : ""
    }oauth_signature="${encodedOAuthSignature}"`;

    return authorizationHeader;
  }
}
