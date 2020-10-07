export const __prod__ = process.env.NODE_ENV === "production";
export const __dev__ = process.env.NODE_ENV === "development";

export const COOKIE_NAME = "qid";

export const FORGOT_PASSWORD_LINK_EXPIRY_HOURS = 3;
export const FORGOT_PASSWORD_LINK_EXPIRY_MS =
  1000 * 60 * 60 * 24 * FORGOT_PASSWORD_LINK_EXPIRY_HOURS;

export const AUTH_ERROR = "Auth error";
export const USER_UNVERIFIED_ERROR = "Unverified error";
